'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shop } from '@/lib/types'
import { ChevronDown } from 'lucide-react'

interface ShopSelectorProps {
  selected: Shop | null
  onSelect: (shop: Shop | null) => void
}

export default function ShopSelector({ selected, onSelect }: ShopSelectorProps) {
  const [shops, setShops] = useState<Shop[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShops()
  }, [])

  const fetchShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('name')

    if (data) {
      setShops(data)
      if (data.length > 0 && !selected) {
        onSelect(data[0])
      }
    }
    
    if (error) {
      console.error('Error fetching shops:', error)
    }
    
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-48 rounded-md"></div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-48 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="truncate">
          {selected ? selected.name : 'Select Shop'}
        </span>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="max-h-60 overflow-y-auto">
            {shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => {
                  onSelect(shop)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between ${
                  selected?.id === shop.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div>
                  <div className="font-medium">{shop.name}</div>
                  <div className="text-sm text-gray-500">{shop.domain}</div>
                </div>
                {shop.is_plus && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Plus
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {shops.length === 0 && (
            <div className="px-4 py-2 text-gray-500 text-center">
              No shops configured
            </div>
          )}
        </div>
      )}
    </div>
  )
}