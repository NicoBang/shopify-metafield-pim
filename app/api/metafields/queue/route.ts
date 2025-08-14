import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { shop_id, job_type, payload, scheduled_for } = await request.json()

    // Validate required fields
    if (!shop_id || !job_type || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, job_type, payload' }, 
        { status: 400 }
      )
    }

    // Validate job_type
    const validJobTypes = ['single_update', 'bulk_update', 'full_sync']
    if (!validJobTypes.includes(job_type)) {
      return NextResponse.json(
        { error: 'Invalid job_type. Must be one of: ' + validJobTypes.join(', ') }, 
        { status: 400 }
      )
    }

    // Verify shop exists
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('id', shop_id)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Insert sync job using admin client (bypasses RLS)
    const { data: job, error } = await supabaseAdmin
      .from('sync_queue')
      .insert({
        shop_id,
        job_type,
        payload,
        scheduled_for: scheduled_for || new Date().toISOString(),
        status: 'pending',
        attempts: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sync job:', error)
      return NextResponse.json(
        { error: 'Failed to create sync job', details: error.message }, 
        { status: 500 }
      )
    }

    // Log audit entry
    await supabaseAdmin
      .from('audit_log')
      .insert({
        shop_id,
        action: 'sync_job_created',
        resource_type: 'sync_queue',
        resource_id: job.id,
        changes: { job_type, scheduled_for }
      })

    return NextResponse.json({ 
      success: true, 
      job_id: job.id,
      message: 'Sync job queued successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in sync queue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop_id = searchParams.get('shop_id')
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('sync_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (shop_id) {
      query = query.eq('shop_id', shop_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ jobs })

  } catch (error: any) {
    console.error('Error fetching sync jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync jobs' }, 
      { status: 500 }
    )
  }
}
