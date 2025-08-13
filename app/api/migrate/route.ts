import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Running database migration...')

    const steps = []
    
    // For now, let's just verify what we can access and create what we can
    console.log('Testing database access...')
    
    // Test if products table exists by trying to select from it
    const { data: existingProducts, error: productsTestError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(1)
    
    if (productsTestError) {
      console.log('Products table does not exist yet:', productsTestError.message)
      steps.push('❌ Products table does not exist - needs manual creation')
    } else {
      console.log('✅ Products table already exists')
      steps.push('✅ Products table already exists')
    }

    // Test if we can access product_metafields
    const { data: metafields, error: metafieldsError } = await supabaseAdmin
      .from('product_metafields')
      .select('*')
      .limit(1)
    
    if (metafieldsError) {
      console.log('Product metafields error:', metafieldsError.message)
      steps.push('❌ Product metafields access error')
    } else {
      console.log('✅ Product metafields table accessible')
      steps.push('✅ Product metafields table accessible')
    }

    // Test if view exists by trying to select from it
    const { data: viewTest, error: viewError } = await supabaseAdmin
      .from('products_with_metafields')
      .select('*')
      .limit(1)

    if (viewError) {
      console.log('View does not exist:', viewError.message)
      steps.push('❌ products_with_metafields view does not exist - needs manual creation')
    } else {
      console.log('✅ View already exists')
      steps.push('✅ products_with_metafields view already exists')
    }

    // Check current schema
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    let availableTables = []
    if (!tablesError && tables) {
      availableTables = tables.map(t => t.table_name)
      steps.push(`📋 Available tables: ${availableTables.join(', ')}`)
    }

    // Check if we have the necessary columns in product_metafields
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, is_nullable')
      .eq('table_name', 'product_metafields')
      .eq('table_schema', 'public')

    if (!columnsError && columns) {
      const valueColumn = columns.find(c => c.column_name === 'value')
      const productUuidColumn = columns.find(c => c.column_name === 'product_uuid')
      
      if (valueColumn) {
        steps.push(`📄 Value column is ${valueColumn.is_nullable === 'YES' ? 'nullable ✅' : 'NOT NULL ❌'}`)
      }
      
      if (productUuidColumn) {
        steps.push('✅ product_uuid column exists')
      } else {
        steps.push('❌ product_uuid column missing - needs manual creation')
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database structure analysis completed',
      steps: steps,
      recommendations: [
        'Manual migration needed via Supabase Dashboard SQL Editor:',
        '1. Run the migration SQL in supabase/migrations/003_improve_product_structure.sql',
        '2. Or copy the SQL from the migration file and execute it manually',
        '3. Ensure products table, indexes, and view are created',
        '4. Test sync functionality after migration'
      ],
      migrationFile: '/supabase/migrations/003_improve_product_structure.sql'
    })

  } catch (error: any) {
    console.error('Migration analysis error:', error)
    return NextResponse.json(
      { error: 'Migration analysis failed', details: error.message }, 
      { status: 500 }
    )
  }
}