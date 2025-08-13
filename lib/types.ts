export interface Shop {
  id: string
  domain: string
  name: string
  access_token: string
  is_plus: boolean
  created_at: string
  updated_at: string
}

export interface MetafieldDefinition {
  id: string
  namespace: string
  key: string
  type: 'single_line_text_field' | 'multi_line_text_field' | 'integer' | 'json' | 'boolean' | 'date' | 'dimension' | 'weight' | 'volume'
  description?: string
  validation_rules?: any
  required: boolean
  created_at: string
}

export interface ProductMetafield {
  id: string
  shop_id: string
  product_id: string
  product_title?: string
  definition_id: string
  value: any
  previous_value?: any
  version: number
  status: 'draft' | 'scheduled' | 'published' | 'syncing'
  scheduled_for?: string
  published_at?: string
  created_by?: string
  updated_at: string
  metafield_definitions?: MetafieldDefinition
}

export interface SyncJob {
  id: string
  shop_id: string
  job_type: 'single_update' | 'bulk_update' | 'full_sync'
  payload: any
  scheduled_for: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  shops?: Shop
}

export interface AuditLog {
  id: string
  shop_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  changes?: any
  user_email?: string
  created_at: string
}

export interface Product {
  id: string // UUID from products table
  shop_id: string
  shopify_product_id: string // The actual Shopify product ID
  title: string
  handle?: string
  status: 'active' | 'archived' | 'draft'
  metafields?: ProductMetafield[]
  created_at: string
  updated_at: string
}

export interface ShopifyProduct {
  id: string // Raw Shopify ID
  title: string
  handle: string
  status: string
  metafields: ShopifyMetafield[]
}

export interface ShopifyMetafield {
  id: string
  namespace: string
  key: string
  value: string
  type: string
}