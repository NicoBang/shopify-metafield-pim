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
    console.log('Looking for existing shop:', shopDomain)
    const { data: existingShop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('domain', shopDomain)
      .single()

    console.log('Existing shop query:', { existingShop, shopError })

    if (existingShop) {
      // Update existing shop
      console.log('Updating existing shop')
      const { error: updateError } = await supabaseAdmin
        .from('shops')
        .update({ 
          access_token: accessToken,
          is_plus: false, // You might want to check this via API
          updated_at: new Date().toISOString()
        })
        .eq('domain', shopDomain)
      
      if (updateError) {
        console.error('Error updating shop:', updateError)
      }
    } else {
      // Create new shop
      console.log('Creating new shop:', {
        name: shopDomain.replace('.myshopify.com', ''),
        domain: shopDomain,
        access_token: accessToken ? 'present' : 'missing'
      })
      
      const { data: newShop, error: insertError } = await supabaseAdmin
        .from('shops')
        .insert({
          name: shopDomain.replace('.myshopify.com', ''),
          domain: shopDomain,
          access_token: accessToken,
          is_plus: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (insertError) {
        console.error('Error creating shop:', insertError)
      } else {
        console.log('Successfully created shop:', newShop)
      }
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