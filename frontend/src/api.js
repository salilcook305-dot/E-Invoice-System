const API_BASE = '/api';

export function getTokens() {
  try {
    const raw = localStorage.getItem('eis_tokens');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('eis_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(tokens, user) {
  if (tokens) localStorage.setItem('eis_tokens', JSON.stringify(tokens));
  if (user) localStorage.setItem('eis_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('eis_tokens');
  localStorage.removeItem('eis_user');
}

export async function apiRequest(endpoint, options = {}) {
  const tokens = getTokens();
  const headers = {
    ...options.headers,
  };

  // Only set Content-Type to JSON if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Token Expiration and Refresh
  if (response.status === 401 && tokens?.refresh) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newTokens = { ...tokens, access: refreshData.access };
        saveAuthSession(newTokens);
        headers['Authorization'] = `Bearer ${newTokens.access}`;
        // Retry initial request
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        clearAuthSession();
        window.dispatchEvent(new Event('auth:logout'));
      }
    } catch {
      clearAuthSession();
      window.dispatchEvent(new Event('auth:logout'));
    }
  }

  return response;
}

