import hashlib

def compute_sha256(data: bytes) -> str:
    """
    Computes hex SHA-256 digest of arbitrary bytes.
    """
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest().upper()

def verify_pdf_integrity(pdf_bytes: bytes, registered_hash: str) -> bool:
    """
    Verifies that the given PDF bytes match the registered SHA-256 hash.
    Constant-time comparison avoids timing attack leakage.
    """
    computed = compute_sha256(pdf_bytes)
    return (
        hashlib.sha256(computed.encode()).digest() == 
        hashlib.sha256(registered_hash.strip().upper().encode()).digest()
    )
