-- =====================================================
-- EIS Database Schema: Customers
-- =====================================================

CREATE TABLE IF NOT EXISTS eis_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    deleted_by_id INTEGER NULL REFERENCES eis_users(id),
    CONSTRAINT uq_customer_gstin UNIQUE(gstin)
);

CREATE INDEX IF NOT EXISTS idx_customer_email ON eis_customers(email);
CREATE INDEX IF NOT EXISTS idx_customer_is_deleted ON eis_customers(is_deleted);

