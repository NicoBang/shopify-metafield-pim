import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-shopify-hmac-sha256')
    const topic = request.headers.get('x-shopify-topic')
    const shop = request.headers.get('x-shopify-shop-domain')

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!webhookSecret || !signature) {
      return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 401 })
    }

    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('base64')

    if (calculatedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook data
    const webhookData = JSON.parse(body)

    // Find the shop in our database
    const { data: shopRecord, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('domain', shop)
      .single()

    if (shopError || !shopRecord) {
      console.error('Shop not found:', shop)
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Handle different webhook topics
    switch (topic) {
      case 'products/create':
      case 'products/update':
        await handleProductUpdate(shopRecord, webhookData)
        break
      
      case 'products/delete':
        await handleProductDelete(shopRecord, webhookData)
        break
      
      case 'app/uninstalled':
        await handleAppUninstall(shopRecord)
        break
      
      default:
        console.log(`Unhandled webhook topic: ${topic}`)
    }

    // Log the webhook
    await supabaseAdmin
      .from('audit_log')
      .insert({
        shop_id: shopRecord.id,
        action: `webhook_${topic?.replace('/', '_')}`,
        resource_type: 'webhook',
        resource_id: webhookData.id?.toString(),
        changes: webhookData
      })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

async function handleProductUpdate(shop: any, productData: any) {
  try {
    // Update product information if it exists in our system
    const { data: existingProducts } = await supabaseAdmin
      .from('product_metafields')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('product_id', productData.id.toString())

    if (existingProducts && existingProducts.length > 0) {
      // Update product title
      await supabaseAdmin
        .from('product_metafields')
        .update({ 
          product_title: productData.title,
          updated_at: new Date().toISOString()
        })
        .eq('shop_id', shop.id)
        .eq('product_id', productData.id.toString())
    }

    // Sync metafields if they exist in the webhook
    if (productData.metafields) {
      for (const metafield of productData.metafields) {
        await syncMetafieldFromWebhook(shop, productData, metafield)
      }
    }
  } catch (error) {
    console.error('Error handling product update:', error)
  }
}

async function handleProductDelete(shop: any, productData: any) {
  try {
    // Remove all metafields for this product
    await supabaseAdmin
      .from('product_metafields')
      .delete()
      .eq('shop_id', shop.id)
      .eq('product_id', productData.id.toString())
  } catch (error) {
    console.error('Error handling product delete:', error)
  }
}

async function handleAppUninstall(shop: any) {
  try {
    // Mark shop as inactive or remove access token
    await supabaseAdmin
      .from('shops')
      .update({ 
        access_token: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', shop.id)
  } catch (error) {
    console.error('Error handling app uninstall:', error)
  }
}

async function syncMetafieldFromWebhook(shop: any, product: any, metafield: any) {
  try {
    // Find or create metafield definition
    let { data: definition } = await supabaseAdmin
      .from('metafield_definitions')
      .select('*')
      .eq('namespace', metafield.namespace)
      .eq('key', metafield.key)
      .single()

    if (!definition) {
      const { data: newDefinition } = await supabaseAdmin
        .from('metafield_definitions')
        .insert({
          namespace: metafield.namespace,
          key: metafield.key,
          type: metafield.type,
          description: `Auto-created from webhook`
        })
        .select()
        .single()
      
      definition = newDefinition
    }

    if (definition) {
      // Upsert product metafield
      await supabaseAdmin
        .from('product_metafields')
        .upsert({
          shop_id: shop.id,
          product_id: product.id.toString(),
          product_title: product.title,
          definition_id: definition.id,
          value: metafield.value,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error syncing metafield from webhook:', error)
  }
}