'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InstallPage() {
  const [shopDomain, setShopDomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopDomain) return

    setIsLoading(true)
    
    // Normalize shop domain
    let normalizedShop = shopDomain.toLowerCase().trim()
    if (!normalizedShop.includes('.myshopify.com')) {
      normalizedShop = `${normalizedShop}.myshopify.com`
    }

    // Redirect to OAuth flow
    const authUrl = `/api/auth?shop=${encodeURIComponent(normalizedShop)}`
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Install Metafield PIM
            </h1>
            <p className="text-gray-600">
              Connect your Shopify store to get started
            </p>
          </div>

          <form onSubmit={handleInstall} className="space-y-6">
            <div>
              <label htmlFor="shop" className="block text-sm font-medium text-gray-700 mb-2">
                Your Shop Domain
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="shop"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="your-shop"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400 text-sm">.myshopify.com</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your shop name (e.g., "my-store" for my-store.myshopify.com)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !shopDomain}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                'Install App'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              This will redirect you to Shopify for authorization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}