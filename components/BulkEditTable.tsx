'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Check, X, Edit2 } from 'lucide-react'
import { Product, MetafieldDefinition } from '@/lib/types'

interface BulkEditTableProps {
  products: Product[]
  definitions: MetafieldDefinition[]
  selectedProducts: string[]
  onSelectionChange: (selected: string[]) => void
  onUpdate: (updates: any[]) => void
}

export interface BulkEditTableRef {
  getAllChanges: () => any[]
  clearChanges: () => void
}

const BulkEditTable = forwardRef<BulkEditTableRef, BulkEditTableProps>(({ 
  products, 
  definitions, 
  selectedProducts, 
  onSelectionChange,
  onUpdate 
}, ref) => {
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, any>>({})

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getAllChanges: () => {
      return Object.entries(editedValues).map(([key, value]) => {
        const [productId, fieldKey] = key.split('-')
        const definition = definitions.find(def => def.key === fieldKey)
        return { 
          productId, 
          fieldKey, 
          value,
          namespace: definition?.namespace || 'custom',
          type: definition?.type || 'single_line_text_field'
        }
      })
    },
    clearChanges: () => {
      setEditedValues({})
    }
  }))

  const handleCellEdit = (productId: string, fieldKey: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [`${productId}-${fieldKey}`]: value
    }))
  }

  const saveChanges = async () => {
    const updates = Object.entries(editedValues).map(([key, value]) => {
      const [productId, fieldKey] = key.split('-')
      return { productId, fieldKey, value }
    })
    
    await onUpdate(updates)
    setEditedValues({})
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(products.map(p => p.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProducts, productId])
    } else {
      onSelectionChange(selectedProducts.filter(id => id !== productId))
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedProducts.length === products.length && products.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            {definitions.map(def => (
              <th key={def.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {def.key}
                {def.required && <span className="text-red-500 ml-1">*</span>}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map(product => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {product.title}
                </div>
                <div className="text-sm text-gray-500">
                  ID: {product.shopify_product_id}
                  {product.handle && <span className="ml-2">({product.handle})</span>}
                </div>
              </td>
              {definitions.map(def => {
                const cellKey = `${product.id}-${def.key}`
                const isEditing = editingCell === cellKey
                
                // Find matching metafield from the new array structure
                const metafield = product.metafields?.find(mf => 
                  mf.metafield_definitions?.namespace === def.namespace && 
                  mf.metafield_definitions?.key === def.key
                )
                const value = editedValues[cellKey] ?? metafield?.value ?? ''
                
                return (
                  <td key={def.id} className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        {def.type === 'multi_line_text_field' ? (
                          <textarea
                            value={value}
                            onChange={(e) => handleCellEdit(product.id, def.key, e.target.value)}
                            className="border rounded px-2 py-1 text-sm w-full"
                            rows={2}
                            autoFocus
                          />
                        ) : def.type === 'boolean' ? (
                          <select
                            value={value?.toString() || ''}
                            onChange={(e) => handleCellEdit(product.id, def.key, e.target.value === 'true')}
                            className="border rounded px-2 py-1 text-sm"
                            autoFocus
                          >
                            <option value="">-</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : def.type === 'integer' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => handleCellEdit(product.id, def.key, parseInt(e.target.value) || '')}
                            className="border rounded px-2 py-1 text-sm w-24"
                            autoFocus
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCellEdit(product.id, def.key, e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        )}
                        <button
                          onClick={() => setEditingCell(null)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCell(null)
                            const newValues = { ...editedValues }
                            delete newValues[cellKey]
                            setEditedValues(newValues)
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center space-x-2 cursor-pointer group"
                        onClick={() => setEditingCell(cellKey)}
                      >
                        <span className="text-sm text-gray-900">
                          {value || <span className="text-gray-400">-</span>}
                        </span>
                        <Edit2 
                          size={14} 
                          className="text-gray-400 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    )}
                  </td>
                )
              })}
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  product.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : product.status === 'archived'
                    ? 'bg-gray-100 text-gray-800'
                    : product.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {products.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No products found
        </div>
      )}
      
      {Object.keys(editedValues).length > 0 && (
        <div className="px-6 py-4 bg-yellow-50 border-t flex justify-between items-center">
          <span className="text-sm text-yellow-800">
            {Object.keys(editedValues).length} unsaved changes
          </span>
          <button
            onClick={saveChanges}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
})

BulkEditTable.displayName = 'BulkEditTable'

export default BulkEditTable