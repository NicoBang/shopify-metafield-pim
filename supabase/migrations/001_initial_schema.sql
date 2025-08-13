-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shops table (multiple Shopify stores)
CREATE TABLE shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_plus BOOLEAN DEFAULT false, -- For rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metafield definitions/templates
CREATE TABLE metafield_definitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_line_text_field', 'multi_line_text_field', 'integer', 'json', 'boolean', 'date', 'dimension', 'weight', 'volume')),
  description TEXT,
  validation_rules JSONB,
  required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(namespace, key)
);

-- Product metafields med versionshistorik
CREATE TABLE product_metafields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_title TEXT,
  definition_id UUID REFERENCES metafield_definitions(id),
  value JSONB NOT NULL,
  previous_value JSONB,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'syncing')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, product_id, definition_id)
);

-- Sync job queue
CREATE TABLE sync_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('single_update', 'bulk_update', 'full_sync')),
  payload JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes JSONB,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_product_metafields_shop_product ON product_metafields(shop_id, product_id);
CREATE INDEX idx_product_metafields_status ON product_metafields(status);
CREATE INDEX idx_sync_queue_scheduled ON sync_queue(scheduled_for, status);
CREATE INDEX idx_sync_queue_shop_status ON sync_queue(shop_id, status);

-- Row Level Security (RLS)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_metafields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE product_metafields;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_queue;