import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Shopify Metafield PIM System
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Manage your Shopify product metafields across multiple stores with bulk editing, 
            scheduled updates, and real-time synchronization.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-blue-600 text-2xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2">Bulk Operations</h3>
              <p className="text-gray-600">Update hundreds of products at once with intelligent rate limiting</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-green-600 text-2xl mb-4">📅</div>
              <h3 className="text-lg font-semibold mb-2">Scheduling</h3>
              <p className="text-gray-600">Schedule metafield updates for future dates with GitHub Actions</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-purple-600 text-2xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold mb-2">Real-time Sync</h3>
              <p className="text-gray-600">Live updates across your team with Supabase realtime</p>
            </div>
          </div>
          
          <div className="space-x-4">
            <Link 
              href="/install" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Install App
            </Link>
            <Link 
              href="/dashboard" 
              className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Open Dashboard
            </Link>
            <Link 
              href="/setup" 
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Setup Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}