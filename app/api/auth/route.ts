import { NextRequest, NextResponse } from 'next/server'
import { shopify } from '@/lib/shopify'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  try {
    // Generate OAuth URL
    const state = Math.random().toString(36).substring(2, 15)
    const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products'
    
    // Ensure we have the correct base URL
    const baseUrl = process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://shopify-metafield-pim.vercel.app'
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/callback`
    
    console.log('OAuth Debug:', { baseUrl, redirectUri, shop })
    
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' }, 
      { status: 500 }
    )
  }
}