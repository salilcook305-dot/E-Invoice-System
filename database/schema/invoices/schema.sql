-- =====================================================
-- EIS Database Schema: Invoices & Invoice Line Items
-- =====================================================

CREATE TABLE IF NOT EXISTS eis_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES eis_customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    balance_remaining DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    pdf_hash VARCHAR(64),
    pdf_file VARCHAR(255),
    notes TEXT,
    created_by_id INTEGER REFERENCES eis_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    deleted_by_id INTEGER REFERENCES eis_users(id)
);

CREATE TABLE IF NOT EXISTS eis_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES eis_invoices(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES eis_products(id),
    description TEXT,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK(unit_price >= 0),
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_number ON eis_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON eis_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_pdf_hash ON eis_invoices(pdf_hash);

