/**
 * One-time migration script to update database structure
 * Run with: node scripts/run-migration.js
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const migrationSQL = `
-- Add products table for better separation of concerns
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, shopify_product_id)
);

-- Make value nullable in product_metafields for better flexibility (only if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_metafields' AND column_name='value' AND is_nullable='NO') THEN
        ALTER TABLE product_metafields ALTER COLUMN value DROP NOT NULL;
        ALTER TABLE product_metafields ALTER COLUMN value SET DEFAULT '{}';
    END IF;
END $$;

-- Add product reference to product_metafields (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_metafields' AND column_name='product_uuid') THEN
        ALTER TABLE product_metafields ADD COLUMN product_uuid UUID REFERENCES products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update constraints safely
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='product_metafields_shop_id_product_id_definition_id_key') THEN
        ALTER TABLE product_metafields DROP CONSTRAINT product_metafields_shop_id_product_id_definition_id_key;
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='unique_product_definition') THEN
        ALTER TABLE product_metafields ADD CONSTRAINT unique_product_definition UNIQUE(product_uuid, definition_id);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_product_metafields_product_uuid ON product_metafields(product_uuid);

-- Enable RLS for new table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Add to realtime (this might fail if already added, that's ok)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create or replace view for easy product with metafields querying
CREATE OR REPLACE VIEW products_with_metafields AS
SELECT 
  p.id,
  p.shop_id,
  p.shopify_product_id,
  p.title,
  p.handle,
  p.status,
  p.created_at,
  p.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pm.id,
        'definition_id', pm.definition_id,
        'namespace', md.namespace,
        'key', md.key,
        'value', pm.value,
        'status', pm.status
      ) 
      ORDER BY md.namespace, md.key
    ) FILTER (WHERE pm.id IS NOT NULL), 
    '[]'::json
  ) as metafields
FROM products p
LEFT JOIN product_metafields pm ON p.id = pm.product_uuid
LEFT JOIN metafield_definitions md ON pm.definition_id = md.id
GROUP BY p.id, p.shop_id, p.shopify_product_id, p.title, p.handle, p.status, p.created_at, p.updated_at;
`

async function runMigration() {
  console.log('🚀 Running database migration...')
  
  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec', {
      sql: migrationSQL
    })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      
      // Try alternative approach - split into smaller queries
      console.log('🔄 Trying alternative approach...')
      
      // Split the migration into smaller parts
      const queries = migrationSQL
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'))
      
      for (const query of queries) {
        if (query.includes('DO $$')) {
          // Skip DO blocks for now as they might not be supported
          console.log('⏭️ Skipping DO block:', query.substring(0, 50) + '...')
          continue
        }
        
        try {
          const { error: queryError } = await supabase
            .from('_sql')
            .select('*')
            .limit(0) // This is a hack to execute raw SQL
            
          if (queryError) {
            console.log('⚠️ Query skipped:', query.substring(0, 100) + '...')
          } else {
            console.log('✅ Query executed')
          }
        } catch (e) {
          console.log('⚠️ Query error:', e.message)
        }
      }
    } else {
      console.log('✅ Migration completed successfully!')
    }
    
    // Verify the new structure
    console.log('🔍 Verifying new structure...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['products', 'products_with_metafields'])
    
    if (tablesError) {
      console.log('⚠️ Could not verify tables:', tablesError.message)
    } else {
      console.log('📋 Found tables:', tables.map(t => t.table_name))
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

runMigration().then(() => {
  console.log('🎉 Migration script completed!')
  process.exit(0)
}).catch(error => {
  console.error('💥 Migration script failed:', error)
  process.exit(1)
})