## Claude Code Prompt: Byg Shopify Metafelt-PIM System

```markdown
# Projekt: Shopify Metafelt-PIM System

Byg et komplet Product Information Management system specifikt til håndtering af Shopify metafelter på tværs af flere butikker. Systemet skal kunne schedulere bulk-opdateringer, have real-time synkronisering og koste minimalt at hoste.

## Teknologi Stack
- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS
- Shopify GraphQL Admin API
- GitHub Actions (schedulering)
- Vercel (hosting)

## MCP Tools at bruge
- filesystem (til at oprette og organisere filer)
- run-bash-command (til npm installation og setup)
- read-file/write-file (til fil manipulation)

## Projektstruktur

Opret følgende struktur:
```
shopify-metafield-pim/
├── app/
│   ├── api/
│   │   ├── metafields/
│   │   │   ├── sync/route.ts
│   │   │   ├── bulk-update/route.ts
│   │   │   └── schedule/route.ts
│   │   ├── webhooks/
│   │   │   └── shopify/route.ts
│   │   └── shops/
│   │       └── route.ts
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── products/page.tsx
│   │   ├── scheduler/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BulkEditTable.tsx
│   ├── MetafieldEditor.tsx
│   ├── SchedulerModal.tsx
│   ├── ShopSelector.tsx
│   └── FilterPanel.tsx
├── lib/
│   ├── supabase.ts
│   ├── shopify.ts
│   ├── rate-limiter.ts
│   └── types.ts
├── hooks/
│   ├── useProducts.ts
│   ├── useMetafields.ts
│   └── useShops.ts
├── .github/
│   └── workflows/
│       ├── sync-metafields.yml
│       └── cleanup-old-jobs.yml
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.local
└── README.md
```

## Step 1: Initialiser projekt

```bash
npx create-next-app@latest shopify-metafield-pim --typescript --tailwind --app
cd shopify-metafield-pim

# Installer dependencies
npm install @supabase/supabase-js @shopify/shopify-api lucide-react date-fns
npm install --save-dev @types/node
```

## Step 2: Database Schema (supabase/migrations/001_initial_schema.sql)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shops table (multiple Shopify stores)
CREATE TABLE shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_plus BOOLEAN DEFAULT false, -- For rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metafield definitions/templates
CREATE TABLE metafield_definitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_line_text_field', 'multi_line_text_field', 'integer', 'json', 'boolean', 'date', 'dimension', 'weight', 'volume')),
  description TEXT,
  validation_rules JSONB,
  required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(namespace, key)
);

-- Product metafields med versionshistorik
CREATE TABLE product_metafields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_title TEXT,
  definition_id UUID REFERENCES metafield_definitions(id),
  value JSONB NOT NULL,
  previous_value JSONB,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'syncing')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, product_id, definition_id)
);

-- Sync job queue
CREATE TABLE sync_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('single_update', 'bulk_update', 'full_sync')),
  payload JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes JSONB,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_product_metafields_shop_product ON product_metafields(shop_id, product_id);
CREATE INDEX idx_product_metafields_status ON product_metafields(status);
CREATE INDEX idx_sync_queue_scheduled ON sync_queue(scheduled_for, status);
CREATE INDEX idx_sync_queue_shop_status ON sync_queue(shop_id, status);

-- Row Level Security (RLS)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_metafields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE product_metafields;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_queue;
```

## Step 3: Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Shopify (for webhook verification)
SHOPIFY_WEBHOOK_SECRET=xxx

# Internal API
SYNC_API_KEY=generate-random-string-here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Core Libraries Setup

### lib/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
```

### lib/shopify.ts
```typescript
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api'

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ['read_products', 'write_products'],
  hostName: process.env.SHOPIFY_APP_URL!,
  apiVersion: ApiVersion.October24,
})

export class ShopifyGraphQLClient {
  private shop: string
  private accessToken: string
  private isPlus: boolean

  constructor(shop: string, accessToken: string, isPlus = false) {
    this.shop = shop
    this.accessToken = accessToken
    this.isPlus = isPlus
  }

  async updateMetafields(productId: string, metafields: any[]) {
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            metafields(first: 100) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      input: {
        id: `gid://shopify/Product/${productId}`,
        metafields: metafields.map(mf => ({
          namespace: mf.namespace,
          key: mf.key,
          value: JSON.stringify(mf.value),
          type: mf.type
        }))
      }
    }

    // Rate limiting logic
    await this.respectRateLimit()

    const response = await fetch(`https://${this.shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query: mutation, variables })
    })

    return response.json()
  }

  private async respectRateLimit() {
    // Implement leaky bucket algorithm
    const maxPoints = this.isPlus ? 500 : 50
    const restoreRate = this.isPlus ? 100 : 50
    // Add actual implementation here
  }

  async bulkUpdateMetafields(updates: any[]) {
    // Implement bulk operations
    const mutation = `
      mutation {
        bulkOperationRunMutation(
          mutation: "mutation call($input: ProductInput!) { productUpdate(input: $input) { product { id } } }",
          stagedUploadPath: "${await this.uploadBulkFile(updates)}"
        ) {
          bulkOperation {
            id
            status
            url
          }
          userErrors {
            field
            message
          }
        }
      }
    `
    
    // Execute and poll for completion
  }

  private async uploadBulkFile(data: any[]): Promise<string> {
    // Convert to JSONL and upload to Shopify
    const jsonl = data.map(d => JSON.stringify(d)).join('\n')
    // Implementation for staged upload
    return 'staged-upload-path'
  }
}
```

### lib/rate-limiter.ts
```typescript
export class RateLimiter {
  private points: number
  private maxPoints: number
  private restoreRate: number
  private lastRestored: number

  constructor(isPlus: boolean = false) {
    this.maxPoints = isPlus ? 500 : 50
    this.restoreRate = isPlus ? 100 : 50
    this.points = this.maxPoints
    this.lastRestored = Date.now()
  }

  async waitIfNeeded(cost: number): Promise<void> {
    this.restore()
    
    if (this.points < cost) {
      const waitTime = Math.ceil((cost - this.points) / this.restoreRate * 1000)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.restore()
    }
    
    this.points -= cost
  }

  private restore() {
    const now = Date.now()
    const secondsPassed = (now - this.lastRestored) / 1000
    const pointsToRestore = Math.floor(secondsPassed * this.restoreRate)
    
    if (pointsToRestore > 0) {
      this.points = Math.min(this.maxPoints, this.points + pointsToRestore)
      this.lastRestored = now
    }
  }
}
```

## Step 5: Main Dashboard Component

### app/dashboard/page.tsx
```typescript
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

  const fetchProducts = async () => {
    if (!selectedShop) return

    const { data, error } = await supabase
      .from('product_metafields')
      .select(`
        *,
        metafield_definitions (*)
      `)
      .eq('shop_id', selectedShop.id)

    if (data) {
      setProducts(data)
    }
  }

  const handleBulkUpdate = async (updates: any[]) => {
    const { error } = await supabase
      .from('sync_queue')
      .insert({
        shop_id: selectedShop?.id,
        job_type: 'bulk_update',
        payload: { updates },
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      })

    if (!error) {
      alert('Bulk update queued successfully!')
    }
  }

  const handleSchedule = async (scheduledFor: Date, productIds: string[]) => {
    const { error } = await supabase
      .from('sync_queue')
      .insert({
        shop_id: selectedShop?.id,
        job_type: 'bulk_update',
        payload: { productIds },
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending'
      })

    if (!error) {
      alert(`Update scheduled for ${scheduledFor.toLocaleString()}`)
      setIsSchedulerOpen(false)
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
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsSchedulerOpen(true)}
                    disabled={selectedProducts.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Schedule Update
                  </button>
                  <button
                    onClick={() => handleBulkUpdate(selectedProducts)}
                    disabled={selectedProducts.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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
```

## Step 6: Components

### components/BulkEditTable.tsx
```typescript
import { useState } from 'react'
import { Check, X, Edit2 } from 'lucide-react'

export default function BulkEditTable({ 
  products, 
  definitions, 
  selectedProducts, 
  onSelectionChange,
  onUpdate 
}) {
  const [editingCell, setEditingCell] = useState(null)
  const [editedValues, setEditedValues] = useState({})

  const handleCellEdit = (productId, fieldKey, value) => {
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange(products.map(p => p.id))
                  } else {
                    onSelectionChange([])
                  }
                }}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Product
            </th>
            {definitions.map(def => (
              <th key={def.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {def.key}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange([...selectedProducts, product.id])
                    } else {
                      onSelectionChange(selectedProducts.filter(id => id !== product.id))
                    }
                  }}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {product.title}
                </div>
                <div className="text-sm text-gray-500">
                  {product.product_id}
                </div>
              </td>
              {definitions.map(def => {
                const cellKey = `${product.id}-${def.key}`
                const isEditing = editingCell === cellKey
                const value = editedValues[cellKey] ?? product.metafields?.[def.key] ?? ''
                
                return (
                  <td key={def.id} className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleCellEdit(product.id, def.key, e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingCell(null)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCell(null)
                            delete editedValues[cellKey]
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
                          {value || '-'}
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
                  product.status === 'published' 
                    ? 'bg-green-100 text-green-800'
                    : product.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
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
}
```

## Step 7: API Routes

### app/api/metafields/sync/route.ts
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopifyGraphQLClient } from '@/lib/shopify'

export async function POST(request: NextRequest) {
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
          started_at: new Date().toISOString()
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
      if (job.payload.product_ids) {
        await supabaseAdmin
          .from('product_metafields')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString()
          })
          .in('product_id', job.payload.product_ids)
          .eq('shop_id', job.shop_id)
      }

      results.push({ job_id: job.id, status: 'success', result })

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)
      
      // Mark as failed
      await supabaseAdmin
        .from('sync_queue')
        .update({ 
          status: job.attempts >= 2 ? 'failed' : 'pending',
          attempts: job.attempts + 1,
          error_message: error.message
        })
        .eq('id', job.id)

      results.push({ job_id: job.id, status: 'failed', error: error.message })
    }
  }

  return NextResponse.json({ 
    processed: results.length,
    results 
  })
}
```

## Step 8: GitHub Actions

### .github/workflows/sync-metafields.yml
```yaml
name: Scheduled Metafield Sync

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync API
        run: |
          response=$(curl -X POST ${{ secrets.PRODUCTION_URL }}/api/metafields/sync \
            -H "Authorization: Bearer ${{ secrets.SYNC_API_KEY }}" \
            -H "Content-Type: application/json" \
            -w "\n%{http_code}")
          
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          
          echo "Response: $body"
          echo "HTTP Code: $http_code"
          
          if [ "$http_code" != "200" ]; then
            echo "Sync failed with HTTP $http_code"
            exit 1
          fi

      - name: Cleanup old jobs
        run: |
          curl -X POST ${{ secrets.PRODUCTION_URL }}/api/cleanup \
            -H "Authorization: Bearer ${{ secrets.SYNC_API_KEY }}"
```

## Step 9: Deployment Scripts

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:migrate": "supabase migration up",
    "db:reset": "supabase db reset",
    "deploy": "vercel --prod",
    "setup": "npm install && npm run db:migrate"
  }
}
```

## Step 10: README med deployment instruktioner

```markdown
# Shopify Metafield PIM System

## Quick Start

1. Clone repository
2. Setup Supabase:
   - Gå til supabase.com og opret projekt
   - Kør migrations: `npx supabase db push`
   - Kopier credentials til .env.local

3. Setup Shopify App:
   - Opret private app i Shopify
   - Generer access token
   - Tilføj webhook subscriptions

4. Deploy til Vercel:
   ```bash
   npm run build
   vercel --prod
   ```

5. Setup GitHub Actions:
   - Tilføj secrets i repository settings
   - Enable workflows

## Features
- ✅ Multi-shop support
- ✅ Bulk metafield editing
- ✅ Scheduled updates
- ✅ Real-time syncing
- ✅ Version history
- ✅ Rate limiting
- ✅ Webhook support

## Omkostninger
- Vercel: $0 (hobby plan)
- Supabase: $0 (free tier)
- GitHub Actions: $0 (2000 min/måned gratis)
- Total: $0-10/måned
```

## VIGTIGE NOTER TIL IMPLEMENTERING:

1. Start med at oprette Supabase projekt først
2. Test lokalt før deployment
3. Implementer rate limiting korrekt for at undgå Shopify API throttling
4. Brug bulk operations for updates over 50 produkter
5. Sæt monitoring op for at tracke failed jobs
6. Implementer proper error handling og retry logic
7. Test webhook verification grundigt
8. Overvej at tilføje caching layer med Redis hvis performance bliver et issue