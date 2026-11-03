-- =====================================================
-- EIS Database Schema: Audit History Log
-- =====================================================

CREATE TABLE IF NOT EXISTS eis_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'ISSUE', 'VOID', 'VERIFY')),
    changes_json TEXT,
    ip_address VARCHAR(45),
    user_id INTEGER REFERENCES eis_users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON eis_audit_log(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON eis_audit_log(timestamp);

