import { NextRequest, NextResponse } from 'next/server'
import { shopify } from '@/lib/shopify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const shopDomain = shop

    // Store shop and access token in database
    const { data: existingShop } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('domain', shopDomain)
      .single()

    if (existingShop) {
      // Update existing shop
      await supabaseAdmin
        .from('shops')
        .update({ 
          access_token: accessToken,
          is_plus: false, // You might want to check this via API
          updated_at: new Date().toISOString()
        })
        .eq('domain', shopDomain)
    } else {
      // Create new shop
      await supabaseAdmin
        .from('shops')
        .insert({
          name: shopDomain.replace('.myshopify.com', ''),
          domain: shopDomain,
          access_token: accessToken,
          is_plus: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Redirect to app dashboard
    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`
    return NextResponse.redirect(redirectUrl)

  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'OAuth callback failed' }, 
      { status: 500 }
    )
  }
}