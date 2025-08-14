import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api'
import '@shopify/shopify-api/adapters/node'

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || 'placeholder',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || 'placeholder',
  scopes: ['read_products', 'write_products', 'read_product_listings', 'write_product_listings'],
  hostName: (process.env.SHOPIFY_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, ''),
  apiVersion: ApiVersion.October22,
  isEmbeddedApp: true,
  isCustomStoreApp: false,
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

  async getProducts(limit = 50) {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              createdAt
              updatedAt
              metafields(first: 20) {
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
          }
        }
      }
    `

    const variables = { first: limit }

    // Rate limiting logic
    await this.respectRateLimit()

    const response = await fetch(`https://${this.shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables })
    })

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`)
    }

    // Transform to simple format
    return result.data.products.edges.map((edge: any) => ({
      id: edge.node.id.replace('gid://shopify/Product/', ''),
      title: edge.node.title,
      handle: edge.node.handle,
      status: edge.node.status,
      metafields: edge.node.metafields.edges.map((mf: any) => ({
        id: mf.node.id,
        namespace: mf.node.namespace,
        key: mf.node.key,
        value: mf.node.value,
        type: mf.node.type
      }))
    }))
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