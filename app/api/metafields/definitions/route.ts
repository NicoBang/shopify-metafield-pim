import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Common metafield definitions
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
    type: 'multi_line_text_field',
    description: 'Product care instructions'
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
    const { data, error } = await supabaseAdmin
      .from('metafield_definitions')
      .select('*')
      .order('namespace, key')

    if (error) {
      throw error
    }

    return NextResponse.json({ definitions: data })

  } catch (error: any) {
    console.error('Error fetching definitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch definitions' }, 
      { status: 500 }
    )
  }
}