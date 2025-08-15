import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopifyGraphQLClient } from '@/lib/shopify'

export async function POST(request: NextRequest) {
  try {
    const { shop_id, job_type, payload, shops } = await request.json()

    console.log('Immediate sync request:', { shop_id, job_type, updatesCount: payload?.updates?.length })

    // Validate required fields
    if (!shop_id || !job_type || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, job_type, payload' }, 
        { status: 400 }
      )
    }

    // Get shop details if not provided
    let shopDetails = shops
    if (!shopDetails) {
      const { data: shop, error: shopError } = await supabaseAdmin
        .from('shops')
        .select('domain, access_token, is_plus')
        .eq('id', shop_id)
        .single()

      if (shopError || !shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
      }
      shopDetails = shop
    }

    // Initialize Shopify client
    const client = new ShopifyGraphQLClient(
      shopDetails.domain,
      shopDetails.access_token,
      shopDetails.is_plus
    )

    // Process updates
    let result
    if (job_type === 'bulk_update' && payload.updates) {
      console.log('Processing bulk update with updates:', payload.updates)
      
      // Process each update individually for better error handling
      const results = []
      for (const update of payload.updates) {
        try {
          console.log('Processing individual update:', update)
          
          // Convert update format to metafield format
          const metafields = [{
            namespace: update.namespace || 'custom',
            key: update.fieldKey || update.key, // Support both fieldKey and key
            value: String(update.value),
            type: update.type || 'single_line_text_field'
          }]

          // Need to get Shopify product ID from our local product ID
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('shopify_product_id')
            .eq('id', update.productId)
            .single()

          if (productError || !product) {
            throw new Error(`Product not found: ${update.productId}`)
          }

          const updateResult = await client.updateMetafields(product.shopify_product_id, metafields)
          results.push({ productId: update.productId, status: 'success', result: updateResult })
          
        } catch (error: any) {
          console.error(`Failed to update product ${update.productId}:`, error)
          results.push({ productId: update.productId, status: 'failed', error: error.message })
        }
      }

      result = { results, totalProcessed: results.length }
      
    } else if (job_type === 'single_update') {
      result = await client.updateMetafields(
        payload.product_id,
        payload.metafields
      )
    } else {
      return NextResponse.json({ error: 'Unsupported job type for immediate sync' }, { status: 400 })
    }

    // Log audit entry
    await supabaseAdmin
      .from('audit_log')
      .insert({
        shop_id,
        action: 'metafield_immediate_sync',
        resource_type: 'product_metafields',
        changes: { job_type, updates_count: payload.updates?.length || 1 }
      })

    console.log('Immediate sync completed:', result)

    return NextResponse.json({ 
      success: true,
      message: 'Metafields updated successfully',
      result
    })

  } catch (error: any) {
    console.error('Immediate sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}