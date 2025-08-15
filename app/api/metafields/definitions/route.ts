import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopifyGraphQLClient } from '@/lib/shopify'

// Common metafield definitions (kept for fallback)
const DEFAULT_DEFINITIONS = [
  {
    namespace: 'custom',
    key: 'description_extended',
    type: 'multi_line_text_field',
    description: 'Extended product description'
  },
  {
    namespace: 'test_data',
    key: 'binding_mount',
    type: 'single_line_text_field',
    description: 'Binding mount'
  },
  {
    namespace: 'custom',
    key: 'material',
    type: 'single_line_text_field',
    description: 'Product material'
  },
  {
    namespace: 'custom',
    key: 'size_chart',
    type: 'url',
    description: 'Size chart URL'
  },
  {
    namespace: 'custom',
    key: 'warranty_info',
    type: 'multi_line_text_field',
    description: 'Warranty information'
  },
  {
    namespace: 'custom',
    key: 'eco_friendly',
    type: 'boolean',
    description: 'Is this product eco-friendly?'
  }
]

export async function POST(request: NextRequest) {
  try {
    // Insert default definitions if they don't exist
    for (const definition of DEFAULT_DEFINITIONS) {
      const { data: existing } = await supabaseAdmin
        .from('metafield_definitions')
        .select('id')
        .eq('namespace', definition.namespace)
        .eq('key', definition.key)
        .single()

      if (!existing) {
        await supabaseAdmin
          .from('metafield_definitions')
          .insert(definition)
      }
    }

    return NextResponse.json({ success: true, created: DEFAULT_DEFINITIONS.length })

  } catch (error: any) {
    console.error('Error creating definitions:', error)
    return NextResponse.json(
      { error: 'Failed to create definitions' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    // If shopId is provided, fetch from Shopify
    if (shopId) {
      console.log('Looking up shop with ID:', shopId)
      
      // Get shop details from database
      const { data: shop, error: shopError } = await supabaseAdmin
        .from('shops')
        .select('domain, access_token, is_plus')
        .eq('id', shopId)
        .single()

      if (shopError) {
        console.error('Shop lookup error:', shopError)
        throw new Error(`Shop lookup failed: ${shopError.message}`)
      }
      
      if (!shop) {
        console.error('Shop not found with ID:', shopId)
        throw new Error('Shop not found')
      }
      
      console.log('Found shop:', shop.domain)

      // Create Shopify client and fetch definitions
      const shopifyClient = new ShopifyGraphQLClient(
        shop.domain,
        shop.access_token,
        shop.is_plus
      )

      console.log('Fetching metafield definitions from Shopify...')
      const shopifyDefinitions = await shopifyClient.getMetafieldDefinitions()
      console.log(`Found ${shopifyDefinitions.length} metafield definitions`)

      // Store/update definitions in database
      for (const definition of shopifyDefinitions) {
        try {
          const { data: existing } = await supabaseAdmin
            .from('metafield_definitions')
            .select('id')
            .eq('namespace', definition.namespace)
            .eq('key', definition.key)
            .single()

          if (!existing) {
            // Only insert fields that exist in the database schema
            const { error: insertError } = await supabaseAdmin
              .from('metafield_definitions')
              .insert({
                namespace: definition.namespace,
                key: definition.key,
                type: definition.type,
                description: definition.description
              })
            
            if (insertError) {
              console.error('Insert error for definition:', definition, insertError)
            }
          } else {
            // Update existing definition (only fields that exist in schema)
            const { error: updateError } = await supabaseAdmin
              .from('metafield_definitions')
              .update({
                type: definition.type,
                description: definition.description
              })
              .eq('namespace', definition.namespace)
              .eq('key', definition.key)
              
            if (updateError) {
              console.error('Update error for definition:', definition, updateError)
            }
          }
        } catch (dbError) {
          console.error('Database error processing definition:', definition, dbError)
          // Continue with other definitions
        }
      }

      return NextResponse.json({ 
        definitions: shopifyDefinitions,
        source: 'shopify',
        count: shopifyDefinitions.length
      })
    }

    // Default behavior: fetch from database
    const { data, error } = await supabaseAdmin
      .from('metafield_definitions')
      .select('*')
      .order('namespace, key')

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      definitions: data,
      source: 'database'
    })

  } catch (error: any) {
    console.error('Error fetching definitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch definitions' }, 
      { status: 500 }
    )
  }
}