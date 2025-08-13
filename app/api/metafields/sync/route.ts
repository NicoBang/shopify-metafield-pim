import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopifyGraphQLClient } from '@/lib/shopify'

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SYNC_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending jobs
    const { data: jobs, error } = await supabaseAdmin
      .from('sync_queue')
      .select(`
        *,
        shops (*)
      `)
      .lte('scheduled_for', new Date().toISOString())
      .eq('status', 'pending')
      .lt('attempts', 3)
      .limit(10)

    if (error || !jobs) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    const results = []

    for (const job of jobs) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('sync_queue')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString(),
            attempts: job.attempts + 1
          })
          .eq('id', job.id)

        // Initialize Shopify client
        const client = new ShopifyGraphQLClient(
          job.shops.domain,
          job.shops.access_token,
          job.shops.is_plus
        )

        // Process based on job type
        let result
        if (job.job_type === 'bulk_update') {
          result = await client.bulkUpdateMetafields(job.payload.updates)
        } else if (job.job_type === 'single_update') {
          result = await client.updateMetafields(
            job.payload.product_id,
            job.payload.metafields
          )
        }

        // Mark as completed
        await supabaseAdmin
          .from('sync_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Update product_metafields status
        if (job.payload.product_ids || job.payload.productIds) {
          const productIds = job.payload.product_ids || job.payload.productIds
          await supabaseAdmin
            .from('product_metafields')
            .update({ 
              status: 'published',
              published_at: new Date().toISOString()
            })
            .in('product_id', productIds)
            .eq('shop_id', job.shop_id)
        }

        // Log audit entry
        await supabaseAdmin
          .from('audit_log')
          .insert({
            shop_id: job.shop_id,
            action: 'metafield_sync',
            resource_type: 'product_metafields',
            changes: { job_id: job.id, status: 'completed' }
          })

        results.push({ job_id: job.id, status: 'success', result })

      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error)
        
        // Mark as failed or retry
        await supabaseAdmin
          .from('sync_queue')
          .update({ 
            status: job.attempts >= 2 ? 'failed' : 'pending',
            error_message: error.message
          })
          .eq('id', job.id)

        // Log audit entry
        await supabaseAdmin
          .from('audit_log')
          .insert({
            shop_id: job.shop_id,
            action: 'metafield_sync_failed',
            resource_type: 'product_metafields',
            changes: { job_id: job.id, error: error.message }
          })

        results.push({ job_id: job.id, status: 'failed', error: error.message })
      }
    }

    return NextResponse.json({ 
      processed: results.length,
      results 
    })

  } catch (error: any) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Metafield Sync API', 
    status: 'active',
    timestamp: new Date().toISOString()
  })
}