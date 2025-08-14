import { NextResponse } from 'next/server'

export async function GET() {
  // Return boolean values to verify env vars exist without exposing secrets
  return NextResponse.json({
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    variables: {
      // Shopify configuration
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
      SHOPIFY_APP_URL: !!process.env.SHOPIFY_APP_URL,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      SHOPIFY_WEBHOOK_SECRET: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      SHOPIFY_SCOPES: !!process.env.SHOPIFY_SCOPES,
      
      // Supabase configuration
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      
      // Internal configuration
      SYNC_API_KEY: !!process.env.SYNC_API_KEY,
    },
    urls: {
      // Show actual URLs for verification (these are not secrets)
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || 'NOT_SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    },
    warnings: [
      ...(!process.env.SHOPIFY_API_KEY ? ['Missing SHOPIFY_API_KEY'] : []),
      ...(!process.env.SHOPIFY_API_SECRET ? ['Missing SHOPIFY_API_SECRET'] : []),
      ...(!process.env.SHOPIFY_APP_URL ? ['Missing SHOPIFY_APP_URL'] : []),
      ...(!process.env.SHOPIFY_WEBHOOK_SECRET ? ['Missing SHOPIFY_WEBHOOK_SECRET'] : []),
      ...(!process.env.NEXT_PUBLIC_SUPABASE_URL ? ['Missing NEXT_PUBLIC_SUPABASE_URL'] : []),
      ...(!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ['Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
      ...(!process.env.SUPABASE_SERVICE_KEY ? ['Missing SUPABASE_SERVICE_KEY'] : []),
      ...(!process.env.SYNC_API_KEY ? ['Missing SYNC_API_KEY'] : []),
      ...(process.env.SHOPIFY_WEBHOOK_SECRET === 'placeholder' ? ['SHOPIFY_WEBHOOK_SECRET is still set to placeholder'] : []),
    ]
  })
}
