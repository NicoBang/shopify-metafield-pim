# Shopify Metafield PIM System

Et komplet Product Information Management system specifikt til håndtering af Shopify metafelter på tværs af flere butikker med bulk-opdateringer, scheduling og real-time synkronisering.

## 🚀 Features

- ✅ **Multi-shop support** - Administrer flere Shopify butikker fra ét dashboard
- ✅ **Bulk metafield editing** - Rediger hundredvis af produkter på samme tid
- ✅ **Scheduled updates** - Planlæg metafield opdateringer til fremtidige tidspunkter
- ✅ **Real-time syncing** - Live opdateringer på tværs af dit team
- ✅ **Version history** - Spor ændringer og rulback til tidligere versioner
- ✅ **Rate limiting** - Intelligent håndtering af Shopify API grænser
- ✅ **Webhook support** - Automatisk synkronisering fra Shopify

## 🛠 Tech Stack

- **Frontend**: Next.js 14 med App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **API Integration**: Shopify GraphQL Admin API
- **Scheduling**: GitHub Actions
- **Hosting**: Vercel (gratis tier)

## 📦 Quick Start

### 1. Klon projektet

```bash
git clone <repo-url>
cd shopify-metafield-pim
npm install
```

### 2. Setup Supabase

1. Gå til [supabase.com](https://supabase.com) og opret et nyt projekt
2. Kør database migration:
   ```bash
   # Upload migration til Supabase
   npx supabase db push
   ```
3. Kopier dine Supabase credentials til `.env.local`

### 3. Setup Shopify App

1. **Opret Private App i Shopify:**
   - Gå til Settings → Apps and sales channels → Private apps
   - Click "Create private app"
   - Tilføj følgende permissions:
     - `read_products`
     - `write_products`
   - Generer Admin API access token

2. **Setup Webhooks:**
   ```
   POST /admin/api/2024-10/webhooks.json
   {
     "webhook": {
       "topic": "products/update",
       "address": "https://your-app.vercel.app/api/webhooks/shopify",
       "format": "json"
     }
   }
   ```

### 4. Environment Variables

Kopier `.env.example` til `.env.local` og udfyld:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Shopify
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# Internal API
SYNC_API_KEY=your-random-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Deploy til Vercel

```bash
npm run build
vercel --prod
```

### 6. Setup GitHub Actions

1. Tilføj secrets i repository settings:
   - `PRODUCTION_URL`: Din Vercel app URL
   - `SYNC_API_KEY`: Dit API key

2. Enable workflows i `.github/workflows/`

## 🏗 Projekt Struktur

```
shopify-metafield-pim/
├── app/
│   ├── api/                 # API routes
│   ├── dashboard/           # Dashboard sider
│   ├── layout.tsx           # Root layout
│   └── page.tsx            # Homepage
├── components/             # React komponenter
├── lib/                   # Core libraries
├── supabase/             # Database migrations
├── .github/workflows/    # GitHub Actions
└── README.md
```

## 📊 Database Schema

- **shops** - Shopify butikker
- **metafield_definitions** - Metafield skabeloner
- **product_metafields** - Produkt metafelter med versionshistorik
- **sync_queue** - Job queue til bulk opdateringer
- **audit_log** - Audit trail

## 🔄 Sync Process

1. **Brugeren laver ændringer** i dashboard
2. **Ændringer gemmes** i `product_metafields` som `draft`
3. **Sync job oprettes** i `sync_queue`
4. **GitHub Actions kører** hver time og kalder sync API
5. **Rate-limited opdateringer** sendes til Shopify
6. **Status opdateres** til `published`
7. **Real-time updates** vises i dashboard

## 💰 Omkostninger

- **Vercel**: $0 (hobby plan)
- **Supabase**: $0 (free tier - op til 500MB database)
- **GitHub Actions**: $0 (2000 minutter/måned gratis)
- **Total**: $0-10/måned (afhængig af usage)

## 🛡 Sikkerhed

- ✅ Webhook signature verification
- ✅ API key authentication
- ✅ Row Level Security i Supabase
- ✅ Environment variable isolation
- ✅ Rate limiting

## 🔧 API Endpoints

### Sync API
```
POST /api/metafields/sync
Authorization: Bearer <SYNC_API_KEY>
```

### Webhook API
```
POST /api/webhooks/shopify
X-Shopify-Hmac-Sha256: <signature>
X-Shopify-Topic: products/update
```

### Shops API
```
GET /api/shops
POST /api/shops
DELETE /api/shops?id=<shop_id>
```

## 🚨 Troubleshooting

### Rate Limiting Issues
- Systemet respekterer automatisk Shopify's rate limits
- Plus stores får højere limits (500 points vs 50)
- Bulk operations bruges automatisk for >50 produkter

### Webhook Verification Failed
- Check `SHOPIFY_WEBHOOK_SECRET` environment variable
- Verificer webhook URL i Shopify admin

### Database Connection Issues
- Check Supabase credentials
- Verificer Row Level Security policies

## 🔄 Development Workflow

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Deploy to Vercel
npm run deploy
```

## 📈 Monitoring

- GitHub Actions logs for sync status
- Supabase logs for database operations
- Vercel function logs for API calls
- Audit log tabel for alle ændringer

## 🤝 Contributing

1. Fork projektet
2. Opret feature branch (`git checkout -b feature/amazing-feature`)
3. Commit dine ændringer (`git commit -m 'Add amazing feature'`)
4. Push til branch (`git push origin feature/amazing-feature`)
5. Åbn Pull Request

## 📄 License

MIT License - se LICENSE filen for detaljer.

---

**Vigtigt**: Husk at teste grundigt i development environment før deployment til production!# shopify-metafield-pim
