-- =====================================================
-- EIS Database Schema: Products / Services Catalog
-- =====================================================

CREATE TABLE IF NOT EXISTS eis_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    unit_price DECIMAL(12, 2) NOT NULL CHECK(unit_price >= 0),
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00 CHECK(gst_rate >= 0),
    hsn_sac_code VARCHAR(16),
    is_active BOOLEAN DEFAULT 1,
    is_deleted BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_sku ON eis_products(sku);
CREATE INDEX IF NOT EXISTS idx_product_active ON eis_products(is_active);

