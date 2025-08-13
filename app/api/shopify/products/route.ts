import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopifyGraphQLClient } from '@/lib/shopify'

export async function POST(request: NextRequest) {
  try {
    const { shopId, limit = 50 } = await request.json()

    // Get shop from database
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.access_token) {
      return NextResponse.json({ error: 'Shop not connected' }, { status: 400 })
    }

    // Fetch products from Shopify
    const client = new ShopifyGraphQLClient(shop.domain, shop.access_token, shop.is_plus)
    const products = await client.getProducts(limit)

    // Store products in database
    for (const product of products) {
      // Check if product already exists
      const { data: existing } = await supabaseAdmin
        .from('product_metafields')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('product_id', product.id)
        .limit(1)
        .single()

      if (!existing) {
        // Create basic product record
        await supabaseAdmin
          .from('product_metafields')
          .insert({
            shop_id: shop.id,
            product_id: product.id,
            product_title: product.title,
            definition_id: null, // Will be set when metafields are added
            value: null,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({ 
      success: true, 
      products: products.length,
      shop: shop.name 
    })

  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' }, 
      { status: 500 }
    )
  }
}