-- Add products table for better separation of concerns
CREATE TABLE products (
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

-- Make value nullable in product_metafields for better flexibility
ALTER TABLE product_metafields ALTER COLUMN value DROP NOT NULL;
ALTER TABLE product_metafields ALTER COLUMN value SET DEFAULT '{}';

-- Add product reference to product_metafields
ALTER TABLE product_metafields ADD COLUMN product_uuid UUID REFERENCES products(id) ON DELETE CASCADE;

-- Update product_metafields to be more flexible
ALTER TABLE product_metafields DROP CONSTRAINT IF EXISTS product_metafields_shop_id_product_id_definition_id_key;
ALTER TABLE product_metafields ADD CONSTRAINT unique_product_definition UNIQUE(product_uuid, definition_id);

-- Create index for better performance
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_product_metafields_product_uuid ON product_metafields(product_uuid);

-- Enable RLS for new table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Create view for easy product with metafields querying
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