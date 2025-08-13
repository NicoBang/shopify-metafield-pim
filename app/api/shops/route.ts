import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('API: Fetching shops from database...')
    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select('id, domain, name, is_plus, created_at, updated_at, access_token')
      .order('name')

    console.log('API: Shops query result:', { shopsCount: shops?.length, error })

    if (error) {
      console.error('API: Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shops })
  } catch (error: any) {
    console.error('API: Error fetching shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { domain, name, access_token, is_plus } = await request.json()

    // Validate required fields
    if (!domain || !name || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, name, access_token' }, 
        { status: 400 }
      )
    }

    // Check if shop already exists
    const { data: existingShop } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('domain', domain)
      .single()

    if (existingShop) {
      // Update existing shop
      const { data: updatedShop, error } = await supabaseAdmin
        .from('shops')
        .update({
          name,
          access_token,
          is_plus: is_plus || false,
          updated_at: new Date().toISOString()
        })
        .eq('domain', domain)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ shop: updatedShop })
    } else {
      // Create new shop
      const { data: newShop, error } = await supabaseAdmin
        .from('shops')
        .insert({
          domain,
          name,
          access_token,
          is_plus: is_plus || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log audit entry
      await supabaseAdmin
        .from('audit_log')
        .insert({
          shop_id: newShop.id,
          action: 'shop_created',
          resource_type: 'shop',
          resource_id: newShop.id,
          changes: { domain, name, is_plus }
        })

      return NextResponse.json({ shop: newShop }, { status: 201 })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('id')

    if (!shopId) {
      return NextResponse.json(
        { error: 'Missing shop id' }, 
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', shopId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}