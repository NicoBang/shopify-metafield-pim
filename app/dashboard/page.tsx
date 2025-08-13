'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BulkEditTable from '@/components/BulkEditTable'
import SchedulerModal from '@/components/SchedulerModal'
import FilterPanel from '@/components/FilterPanel'
import ShopSelector from '@/components/ShopSelector'
import { Product, Shop, MetafieldDefinition } from '@/lib/types'

export default function Dashboard() {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [definitions, setDefinitions] = useState<MetafieldDefinition[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    hasEmptyFields: false,
    status: 'all'
  })

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedShop) return

    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_metafields',
          filter: `shop_id=eq.${selectedShop.id}`
        },
        (payload) => {
          console.log('Real-time update:', payload)
          fetchProducts()
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'sync_queue',
          filter: `shop_id=eq.${selectedShop.id}`
        },
        (payload) => {
          console.log('Sync status update:', payload)
          // Update UI to show sync status
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedShop])

  useEffect(() => {
    if (selectedShop) {
      fetchProducts()
      fetchDefinitions()
    }
  }, [selectedShop])

  const fetchProducts = async () => {
    if (!selectedShop) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('product_metafields')
      .select(`
        *,
        metafield_definitions (*)
      `)
      .eq('shop_id', selectedShop.id)

    if (data) {
      // Transform data to match Product interface
      const transformedProducts: Product[] = data.map(item => ({
        id: item.id,
        title: item.product_title || 'Untitled Product',
        product_id: item.product_id,
        status: item.status,
        metafields: { [item.metafield_definitions?.key || '']: item.value }
      }))
      
      setProducts(transformedProducts)
    }
    
    if (error) {
      console.error('Error fetching products:', error)
    }
    
    setLoading(false)
  }

  const fetchDefinitions = async () => {
    const { data, error } = await supabase
      .from('metafield_definitions')
      .select('*')
      .order('namespace, key')

    if (data) {
      setDefinitions(data)
    }
  }

  const handleBulkUpdate = async (updates: any[]) => {
    if (!selectedShop) return

    const { error } = await supabase
      .from('sync_queue')
      .insert({
        shop_id: selectedShop.id,
        job_type: 'bulk_update',
        payload: { updates },
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      })

    if (!error) {
      alert('Bulk update queued successfully!')
      setSelectedProducts([])
    } else {
      alert('Error queuing bulk update')
    }
  }

  const handleSchedule = async (scheduledFor: Date, productIds: string[]) => {
    if (!selectedShop) return

    const { error } = await supabase
      .from('sync_queue')
      .insert({
        shop_id: selectedShop.id,
        job_type: 'bulk_update',
        payload: { productIds },
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending'
      })

    if (!error) {
      alert(`Update scheduled for ${scheduledFor.toLocaleString()}`)
      setIsSchedulerOpen(false)
      setSelectedProducts([])
    } else {
      alert('Error scheduling update')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Metafield Manager
            </h1>
            <ShopSelector 
              selected={selectedShop}
              onSelect={setSelectedShop}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedShop ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar Filters */}
            <div className="col-span-3">
              <FilterPanel 
                filters={filters}
                onChange={setFilters}
                definitions={definitions}
              />
            </div>

            {/* Main Table */}
            <div className="col-span-9">
              <div className="bg-white rounded-lg shadow">
                {/* Toolbar */}
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedProducts.length} selected
                    </span>
                    {loading && (
                      <span className="text-sm text-blue-600">Loading...</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsSchedulerOpen(true)}
                      disabled={selectedProducts.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schedule Update
                    </button>
                    <button
                      onClick={() => handleBulkUpdate(selectedProducts.map(id => ({ productId: id })))}
                      disabled={selectedProducts.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Now
                    </button>
                  </div>
                </div>

                {/* Table */}
                <BulkEditTable
                  products={products}
                  definitions={definitions}
                  selectedProducts={selectedProducts}
                  onSelectionChange={setSelectedProducts}
                  onUpdate={handleBulkUpdate}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Shop to Get Started
            </h3>
            <p className="text-gray-500">
              Choose a Shopify store from the dropdown above to manage its metafields.
            </p>
          </div>
        )}
      </main>

      {/* Scheduler Modal */}
      <SchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        onSchedule={handleSchedule}
        selectedProducts={selectedProducts}
      />
    </div>
  )
}