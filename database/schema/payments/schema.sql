-- =====================================================
-- EIS Database Schema: Payments
-- =====================================================

CREATE TABLE IF NOT EXISTS eis_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES eis_invoices(id),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (payment_method IN ('BANK_TRANSFER', 'UPI', 'CREDIT_CARD', 'CASH', 'CHEQUE')),
    transaction_reference VARCHAR(128) NOT NULL,
    notes TEXT,
    recorded_by_id INTEGER REFERENCES eis_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_invoice ON eis_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_trans_ref ON eis_payments(transaction_reference);

