'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import BulkEditTable, { BulkEditTableRef } from '@/components/BulkEditTable'
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
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    hasEmptyFields: false,
    status: 'all'
  })
  const bulkEditTableRef = useRef<BulkEditTableRef>(null)

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedShop) return

    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `shop_id=eq.${selectedShop.id}`
        },
        (payload) => {
          console.log('Products real-time update:', payload)
          fetchProducts()
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_metafields',
          filter: `shop_id=eq.${selectedShop.id}`
        },
        (payload) => {
          console.log('Metafields real-time update:', payload)
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
    
    // Use the new products_with_metafields view for easier querying
    const { data, error } = await supabase
      .from('products_with_metafields')
      .select('*')
      .eq('shop_id', selectedShop.id)
      .order('updated_at', { ascending: false })

    if (data) {
      // Transform data to match Product interface
      const transformedProducts: Product[] = data.map(item => ({
        id: item.id,
        shop_id: item.shop_id,
        shopify_product_id: item.shopify_product_id,
        title: item.title,
        handle: item.handle,
        status: item.status,
        metafields: item.metafields || [],
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
      
      setProducts(transformedProducts)
    }
    
    if (error) {
      console.error('Error fetching products:', error)
      
      // Fallback: try fetching from products table directly
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', selectedShop.id)
        .order('updated_at', { ascending: false })
        
      if (fallbackData) {
        const fallbackProducts: Product[] = fallbackData.map(item => ({
          id: item.id,
          shop_id: item.shop_id,
          shopify_product_id: item.shopify_product_id,
          title: item.title,
          handle: item.handle,
          status: item.status,
          metafields: [],
          created_at: item.created_at,
          updated_at: item.updated_at
        }))
        
        setProducts(fallbackProducts)
      }
      
      if (fallbackError) {
        console.error('Fallback error:', fallbackError)
      }
    }
    
    setLoading(false)
  }

  const syncShopifyProducts = async () => {
    if (!selectedShop) return

    setLoading(true)
    try {
      // Sync products
      const productResponse = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: selectedShop.id,
          limit: 50
        })
      })

      if (!productResponse.ok) {
        const error = await productResponse.json()
        alert(`Error syncing products: ${error.error}`)
        return
      }

      const productResult = await productResponse.json()

      // Sync metafield definitions
      const definitionsResponse = await fetch(`/api/metafields/definitions?shopId=${selectedShop.id}`)
      
      let definitionsCount = 0
      if (definitionsResponse.ok) {
        const definitionsResult = await definitionsResponse.json()
        definitionsCount = definitionsResult.definitions?.length || 0
        // Reload definitions
        fetchDefinitions()
      }

      const message = `Successfully synced from ${productResult.shop}!\n` +
                     `Products: ${productResult.products} (${productResult.inserted} new, ${productResult.updated} updated)\n` +
                     `Metafield definitions: ${definitionsCount}`
      alert(message)
      fetchProducts() // Reload the local products
      
    } catch (error) {
      console.error('Sync error:', error)
      alert('Error syncing products')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultDefinitions = async () => {
    try {
      const response = await fetch('/api/metafields/definitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        alert('Default metafield definitions created!')
        fetchDefinitions() // Reload definitions
      } else {
        const error = await response.json()
        alert(`Error creating definitions: ${error.error}`)
      }
    } catch (error) {
      console.error('Definition creation error:', error)
      alert('Error creating definitions')
    }
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

    try {
      const response = await fetch('/api/metafields/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_id: selectedShop.id,
          job_type: 'bulk_update',
          payload: { updates },
          scheduled_for: new Date().toISOString()
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('Bulk update queued successfully!')
        setSelectedProducts([])
      } else {
        console.error('Sync queue error:', result)
        alert(`Error queuing bulk update: ${result.error}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('Error queuing bulk update')
    }
  }

  const handleImmediateUpdate = async (updates: any[]) => {
    if (!selectedShop || updates.length === 0) {
      alert('Please make some changes first')
      return
    }

    setSyncing(true)
    try {
      console.log('Processing immediate update with data:', updates)
      
      // Create a job payload similar to queue format
      const jobPayload = {
        shop_id: selectedShop.id,
        job_type: 'bulk_update',
        payload: { updates },
        shops: {
          domain: selectedShop.domain,
          access_token: selectedShop.access_token,
          is_plus: selectedShop.is_plus
        }
      }

      // Call sync API directly
      const response = await fetch('/api/metafields/sync-immediate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobPayload)
      })

      const result = await response.json()

      if (response.ok) {
        alert('Metafields updated successfully!')
        await fetchProducts() // Reload products
        setSelectedProducts([])
        bulkEditTableRef.current?.clearChanges() // Only clear after successful sync
      } else {
        console.error('Immediate sync error:', result)
        alert(`Error updating metafields: ${result.error}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('Error updating metafields')
    } finally {
      setSyncing(false)
    }
  }

  const handleSchedule = async (scheduledFor: Date, productIds: string[]) => {
    if (!selectedShop) return

    try {
      const response = await fetch('/api/metafields/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_id: selectedShop.id,
          job_type: 'bulk_update',
          payload: { productIds },
          scheduled_for: scheduledFor.toISOString()
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Update scheduled for ${scheduledFor.toLocaleString()}`)
        setIsSchedulerOpen(false)
        setSelectedProducts([])
      } else {
        console.error('Sync queue error:', result)
        alert(`Error scheduling update: ${result.error}`)
      }
    } catch (error) {
      console.error('Network error:', error)
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
                      onClick={syncShopifyProducts}
                      disabled={loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Syncing...' : 'Sync Products'}
                    </button>
                    <button
                      onClick={() => setIsSchedulerOpen(true)}
                      disabled={selectedProducts.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schedule Update
                    </button>
                    <button
                      onClick={() => {
                        const changes = bulkEditTableRef.current?.getAllChanges() || []
                        if (changes.length > 0) {
                          handleImmediateUpdate(changes)
                        } else {
                          alert('Please make some changes first')
                        }
                      }}
                      disabled={syncing}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {syncing ? 'Updating...' : 'Update Now'}
                    </button>
                  </div>
                </div>

                {/* Table */}
                <BulkEditTable
                  ref={bulkEditTableRef}
                  products={products}
                  definitions={definitions}
                  selectedProducts={selectedProducts}
                  onSelectionChange={setSelectedProducts}
                  onUpdate={handleImmediateUpdate}
                  syncing={syncing}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Metafield PIM
            </h3>
            <p className="text-gray-500 mb-6">
              Your Shopify store is connected! Get started by setting up metafield definitions and syncing your products.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={createDefaultDefinitions}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Default Metafields
              </button>
            </div>
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