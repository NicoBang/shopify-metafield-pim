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
    const shopifyProducts = await client.getProducts(limit)

    let insertedProducts = 0
    let updatedProducts = 0

    // Store products in database
    for (const shopifyProduct of shopifyProducts) {
      // Check if product already exists in products table
      const { data: existingProduct, error: checkError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('shopify_product_id', shopifyProduct.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing product:', checkError)
        continue
      }

      let productRecord
      
      if (!existingProduct) {
        // Create new product record
        const { data: newProduct, error: insertError } = await supabaseAdmin
          .from('products')
          .insert({
            shop_id: shop.id,
            shopify_product_id: shopifyProduct.id,
            title: shopifyProduct.title,
            handle: shopifyProduct.handle,
            status: shopifyProduct.status.toLowerCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting product:', insertError)
          continue
        }
        
        productRecord = newProduct
        insertedProducts++
      } else {
        // Update existing product
        const { data: updatedProduct, error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            title: shopifyProduct.title,
            handle: shopifyProduct.handle,
            status: shopifyProduct.status.toLowerCase(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating product:', updateError)
          continue
        }
        
        productRecord = updatedProduct
        updatedProducts++
      }

      // Get metafield definitions to match against
      const { data: definitions } = await supabaseAdmin
        .from('metafield_definitions')
        .select('*')

      // Process metafields if we have definitions
      if (definitions && shopifyProduct.metafields.length > 0) {
        for (const shopifyMetafield of shopifyProduct.metafields) {
          // Find matching definition
          const definition = definitions.find(def => 
            def.namespace === shopifyMetafield.namespace && 
            def.key === shopifyMetafield.key
          )

          if (definition) {
            // Check if metafield record already exists
            const { data: existingMetafield } = await supabaseAdmin
              .from('product_metafields')
              .select('*')
              .eq('product_uuid', productRecord.id)
              .eq('definition_id', definition.id)
              .single()

            const metafieldData = {
              product_uuid: productRecord.id,
              shop_id: shop.id,
              product_id: shopifyProduct.id, // Keep for backward compatibility
              product_title: shopifyProduct.title,
              definition_id: definition.id,
              value: shopifyMetafield.value,
              status: 'published',
              updated_at: new Date().toISOString()
            }

            if (!existingMetafield) {
              // Create new metafield record
              await supabaseAdmin
                .from('product_metafields')
                .insert({
                  ...metafieldData,
                  created_at: new Date().toISOString()
                })
            } else {
              // Update existing metafield record
              await supabaseAdmin
                .from('product_metafields')
                .update(metafieldData)
                .eq('id', existingMetafield.id)
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      products: shopifyProducts.length,
      inserted: insertedProducts,
      updated: updatedProducts,
      shop: shop.name 
    })

  } catch (error: any) {
    console.error('Error syncing products:', error)
    return NextResponse.json(
      { error: 'Failed to sync products', details: error.message }, 
      { status: 500 }
    )
  }
}