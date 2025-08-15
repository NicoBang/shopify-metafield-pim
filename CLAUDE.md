# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Database Management
```bash
# Run database migrations
npm run db:migrate

# Reset database (destructive)
npm run db:reset

# Setup project (install + migrate)
npm run setup
```

### Deployment
```bash
# Deploy to Vercel production
npm run deploy

# Or using Vercel CLI directly
vercel --prod
```

### Supabase Local Development
```bash
# Start local Supabase stack
supabase start

# Stop local stack
supabase stop

# Apply migrations to remote
supabase db push

# Pull database changes
supabase db pull
```

## Project Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime subscriptions)
- **API Integration**: Shopify GraphQL Admin API with rate limiting
- **Deployment**: Vercel with 5-minute function timeout
- **Auth**: Row Level Security (RLS) in Supabase

### Core Data Flow
1. **Shop Management**: Multi-tenant architecture where each `shops` record represents a Shopify store
2. **Product Sync**: Products synced from Shopify API → stored in `products` table with local UUID
3. **Metafield Workflow**: Draft changes → `sync_queue` → scheduled processing → Shopify API → published status
4. **Real-time Updates**: Supabase realtime subscriptions for live dashboard updates

### Database Schema (Key Tables)
- `shops` - Shopify store connections with access tokens
- `products` - Local product cache with Shopify product ID mapping
- `metafield_definitions` - Reusable metafield templates/schemas
- `product_metafields` - Versioned metafield values with draft/published states
- `sync_queue` - Job queue for batch processing with retry logic
- `audit_log` - Full audit trail of all changes

### API Architecture
**Rate-Limited Shopify Integration**:
- Uses `ShopifyGraphQLClient` class with leaky bucket algorithm
- Automatic detection of Shopify Plus stores for higher rate limits (500 vs 50 points)
- Bulk operations for >50 products to optimize API usage

**Queue-Based Processing**:
- All Shopify writes go through `sync_queue` table
- External cron jobs (GitHub Actions planned) process queue
- Supports immediate, scheduled, and bulk updates

**API Routes**:
- `/api/metafields/sync` - Main sync processor (requires SYNC_API_KEY)
- `/api/metafields/queue` - Add jobs to sync queue
- `/api/shopify/products` - Sync products from Shopify
- `/api/shops` - Manage shop connections
- `/api/webhooks/shopify` - Handle Shopify webhooks

### Component Architecture
**Real-time Dashboard** (`app/dashboard/page.tsx`):
- Shop selector for multi-tenant switching
- Live product table with metafield editing
- Bulk selection and operations
- Scheduling interface for future updates

**Key Components**:
- `BulkEditTable` - Main product/metafield editing interface
- `ShopSelector` - Multi-shop switcher with connection status
- `SchedulerModal` - Date/time picker for scheduled updates
- `FilterPanel` - Product filtering and search

### Environment Configuration
Required environment variables:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Shopify webhook verification
SHOPIFY_WEBHOOK_SECRET=

# Internal API security
SYNC_API_KEY=

# App URL for redirects
NEXT_PUBLIC_APP_URL=
```

### Key File Locations
- `/lib/types.ts` - TypeScript interfaces for all data models
- `/lib/shopify.ts` - Shopify GraphQL client with rate limiting
- `/lib/supabase.ts` - Supabase client configuration
- `/supabase/migrations/` - Database schema migrations
- `/app/api/` - All API routes following Next.js 14 App Router pattern

### Development Patterns
- Use absolute imports with `@/` prefix (configured in tsconfig.json)
- Real-time subscriptions for UI updates (using Supabase channels)
- Error handling with user-friendly messages and audit logging
- TypeScript strict mode enabled for type safety
- Row Level Security policies for multi-tenant data isolation

### Testing Product Sync
1. Add shop via ShopSelector component
2. Use "Sync Products" button to fetch from Shopify
3. Create metafield definitions if none exist
4. Edit metafields in bulk table
5. Use "Update Now" or "Schedule Update" for processing

### Common Troubleshooting
- Check Supabase connection and RLS policies if data doesn't load
- Verify `SYNC_API_KEY` matches between sync API and external cron
- Monitor rate limiting if Shopify API calls fail
- Check `sync_queue` table for failed jobs and error messages