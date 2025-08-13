import Link from 'next/link'

export default function SetupPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Setup Guide</h1>
        
        <div className="prose max-w-none">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">🚀 Getting Started</h2>
            <p className="text-blue-800">
              Follow these steps to connect your Shopify store and start managing metafields.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Database Setup</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">✅ Database is configured and ready!</p>
                <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
                  <li>Supabase connection established</li>
                  <li>All required tables created</li>
                  <li>Database schema is up to date</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Shopify App Configuration</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800">⚠️ Manual setup required</p>
              </div>
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li>Create a Shopify Partner account at <a href="https://partners.shopify.com" className="text-blue-600 underline">partners.shopify.com</a></li>
                <li>Create a new app in your Partner Dashboard</li>
                <li>Configure your app with these settings:
                  <ul className="mt-2 ml-6 list-disc list-inside text-sm">
                    <li>App URL: <code className="bg-gray-100 px-1 rounded">https://your-domain.com</code></li>
                    <li>Allowed redirection URL: <code className="bg-gray-100 px-1 rounded">https://your-domain.com/auth/callback</code></li>
                  </ul>
                </li>
                <li>Add required scopes: <code className="bg-gray-100 px-1 rounded">read_products, write_products</code></li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Environment Variables</h2>
              <p className="text-gray-600 mb-4">Update your <code className="bg-gray-100 px-1 rounded">.env.local</code> file with:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_APP_URL=https://your-domain.com

# Shopify Webhook Secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Internal API Security
SYNC_API_KEY=generate_random_string_here`}
              </pre>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 4: Webhook Setup</h2>
              <p className="text-gray-600 mb-4">Configure webhooks in your Shopify app to receive real-time updates:</p>
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-medium mb-2">Required Webhooks:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <code className="bg-gray-100 px-1 rounded">products/create</code> → <code>/api/webhooks/shopify</code></li>
                  <li>• <code className="bg-gray-100 px-1 rounded">products/update</code> → <code>/api/webhooks/shopify</code></li>
                  <li>• <code className="bg-gray-100 px-1 rounded">products/delete</code> → <code>/api/webhooks/shopify</code></li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 5: Deploy & Test</h2>
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li>Deploy your app to your hosting platform (Vercel, Railway, etc.)</li>
                <li>Update your Shopify app settings with the production URL</li>
                <li>Install the app on a test store</li>
                <li>Verify the connection in the dashboard</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Next Steps</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 mb-3">Once setup is complete, you can:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Create metafield definitions in the dashboard</li>
                  <li>• Bulk edit product metafields</li>
                  <li>• Schedule future metafield updates</li>
                  <li>• Monitor sync status in real-time</li>
                </ul>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link 
              href="/dashboard" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}