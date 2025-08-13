'use client'

import { Search, Filter } from 'lucide-react'
import { MetafieldDefinition } from '@/lib/types'

interface FilterPanelProps {
  filters: {
    search: string
    hasEmptyFields: boolean
    status: string
  }
  onChange: (filters: any) => void
  definitions: MetafieldDefinition[]
}

export default function FilterPanel({ filters, onChange, definitions }: FilterPanelProps) {
  const updateFilter = (key: string, value: any) => {
    onChange({
      ...filters,
      [key]: value
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Products
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Product title or ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="syncing">Syncing</option>
        </select>
      </div>

      {/* Empty Fields Filter */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.hasEmptyFields}
            onChange={(e) => updateFilter('hasEmptyFields', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Has empty metafields
          </span>
        </label>
      </div>

      {/* Metafield Definitions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Metafield Types
        </h4>
        <div className="space-y-2">
          {definitions.map((def) => (
            <div key={def.id} className="flex items-center text-sm">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                def.required ? 'bg-red-400' : 'bg-gray-300'
              }`} />
              <span className="text-gray-700">
                {def.namespace}.{def.key}
              </span>
              {def.required && (
                <span className="ml-auto text-xs text-red-600">Required</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}