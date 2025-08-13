import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all shops from database
    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      shops,
      error,
      count: shops?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching shops:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}