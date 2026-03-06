const { Pool } = require('pg');
require('dotenv').config();

const migrations = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NULL,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE
);

-- Create index on session expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    canonical_name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    spec_json JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material aliases table
CREATE TABLE IF NOT EXISTS material_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alias_text VARCHAR(200) NOT NULL,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    city VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RFQs table
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_name VARCHAR(200) NOT NULL,
    delivery_city VARCHAR(50) NOT NULL,
    desired_date DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RFQ items table
CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    qty DECIMAL(15, 4) NOT NULL CHECK (qty > 0),
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supplier invites table
CREATE TABLE IF NOT EXISTS supplier_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token_hash for lookups
CREATE INDEX IF NOT EXISTS idx_supplier_invites_token ON supplier_invites(token_hash);

-- Add token_selector for O(1) token lookup (indexed plain-text prefix, first 16 chars of token)
ALTER TABLE IF EXISTS supplier_invites ADD COLUMN IF NOT EXISTS token_selector VARCHAR(16) NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_invites_token_selector ON supplier_invites(token_selector);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',
    transport_cost DECIMAL(15, 4) NULL,
    payment_terms VARCHAR(100) NULL,
    lead_time_days INTEGER NULL,
    notes TEXT NULL,
    is_winning_offer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Offer items table
CREATE TABLE IF NOT EXISTS offer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    rfq_item_id UUID NOT NULL REFERENCES rfq_items(id),
    unit_price DECIMAL(15, 4) NOT NULL,
    available_qty DECIMAL(15, 4) NULL,
    lead_time_days_override INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    supplier_id UUID NULL REFERENCES suppliers(id),
    city VARCHAR(50) NULL,
    unit_price DECIMAL(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('offer', 'import', 'manual')),
    rfq_id UUID NULL REFERENCES rfqs(id),
    offer_id UUID NULL REFERENCES offers(id)
);

-- Create indexes for price queries
CREATE INDEX IF NOT EXISTS idx_price_history_tenant_material ON price_history(tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_price_history_observed_at ON price_history(observed_at);
CREATE INDEX IF NOT EXISTS idx_price_history_city ON price_history(city);

-- Material price stats table
CREATE TABLE IF NOT EXISTS material_price_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id),
    city VARCHAR(50) NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_price DECIMAL(15, 4) NULL,
    avg_30 DECIMAL(15, 4) NULL,
    avg_60 DECIMAL(15, 4) NULL,
    avg_90 DECIMAL(15, 4) NULL,
    min_90 DECIMAL(15, 4) NULL,
    max_90 DECIMAL(15, 4) NULL,
    volatility_90 DECIMAL(15, 4) NULL,
    trend_90 DECIMAL(15, 4) NULL,
    UNIQUE(tenant_id, material_id, city)
);

-- Create index on stats
CREATE INDEX IF NOT EXISTS idx_material_price_stats_tenant_material ON material_price_stats(tenant_id, material_id);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NULL REFERENCES materials(id),
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('threshold', 'volatility')),
    params_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID NULL REFERENCES alert_rules(id),
    material_id UUID NULL REFERENCES materials(id),
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ack')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on alerts status
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(tenant_id, status);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    metadata_json JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_entity ON audit_log(tenant_id, entity_type, entity_id);

-- BullMQ jobs table (for tracking)
CREATE TABLE IF NOT EXISTS bullmq_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    data JSONB NULL,
    opts JSONB NULL,
    state VARCHAR(20) NOT NULL,
    progress INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    delay INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_on TIMESTAMP WITH TIME ZONE NULL,
    finished_on TIMESTAMP WITH TIME ZONE NULL,
    failed_reason TEXT NULL,
    stacktrace JSONB NULL
);

-- Migration fixes for existing tables (idempotent, safe to run on fresh DB)
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL;
-- Note: rule_type, is_active are already defined in CREATE TABLE above.
-- threshold and city are legacy columns kept for older DB instances.
ALTER TABLE IF EXISTS alert_rules ADD COLUMN IF NOT EXISTS threshold DECIMAL(15, 4) NULL;
ALTER TABLE IF EXISTS alert_rules ADD COLUMN IF NOT EXISTS city VARCHAR(50) NULL;
`;

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'buildex',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('Running migrations...');
    await pool.query(migrations);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
