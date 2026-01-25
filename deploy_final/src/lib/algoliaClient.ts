/**
 * Algolia Client for Farmatodo
 * Fast access to aggregated product stock data
 */

// Algolia credentials discovered during research
const ALGOLIA_APP_ID = 'VCOJEYD2PO';
const ALGOLIA_API_KEY = '869a91e98550dd668b8b1dc04bca9011';
const ALGOLIA_INDEX = 'products-venezuela';

interface AlgoliaProduct {
    objectID: string;
    description: string;
    name?: string;
    stock: number;
    storetotal: number;
    totalStock?: number;
    avg_stock?: number;
    price: number;
    brand?: string;
    category?: string;
    sku?: string;
    sales?: number;
    stores_with_stock?: number[]; // Array of store IDs
}

interface AlgoliaResponse {
    hits: AlgoliaProduct[];
    nbHits: number;
    page: number;
    nbPages: number;
}

/**
 * Search products in Algolia
 */
export async function searchProducts(query: string, limit = 10): Promise<AlgoliaProduct[]> {
    const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-Algolia-Application-Id': ALGOLIA_APP_ID,
            'X-Algolia-API-Key': ALGOLIA_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            hitsPerPage: limit,
            attributesToRetrieve: [
                'objectID',
                'description',
                'name',
                'stock',
                'storetotal',
                'totalStock',
                'avg_stock',
                'price',
                'brand',
                'category',
                'sku',
                'sales',
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`Algolia search failed: ${response.status}`);
    }

    const data: AlgoliaResponse = await response.json();
    return data.hits;
}

/**
 * Get product by ID from Algolia
 */
export async function getProductById(productId: string): Promise<AlgoliaProduct | null> {
    const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/${productId}`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-Algolia-Application-Id': ALGOLIA_APP_ID,
                'X-Algolia-API-Key': ALGOLIA_API_KEY,
            },
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Algolia get failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Algolia getProductById error:', error);
        return null;
    }
}

/**
 * Get aggregate stock info - fast response for instant display
 */
export async function getAggregateStock(productIdOrName: string): Promise<{
    found: boolean;
    product_name: string | null;
    total_stock: number;
    stores_with_stock: number;
    avg_per_store: number;
    price: number | null;
    sales: number | null;
}> {
    // Try by ID first
    let product = await getProductById(productIdOrName);

    // If not found, do NOT search by name/text. This causes "Top Product" leaks (278k sales bug).
    // The previous logic falling back to 'searchProducts(id)' returned the #1 item in the index when the ID wasn't found as a keyword.
    // We strictly want ID match or nothing.
    if (!product) {
        // Double check: if input is numeric, we shouldn't search it as text.
        // Returning null allows the API route to use its 'stock_history' fallback safely.

        // NO-OP
    }

    if (!product) {
        return {
            found: false,
            product_name: null,
            total_stock: 0,
            stores_with_stock: 0,
            avg_per_store: 0,
            price: null,
            sales: null,
        };
    }

    const totalStock = product.stock || product.totalStock || 0;
    // Fallback: If storetotal is missing, check length of stores_with_stock array
    const storeCount = product.storetotal || (Array.isArray(product.stores_with_stock) ? product.stores_with_stock.length : 0);

    return {
        found: true,
        product_name: product.description || product.name || null,
        total_stock: totalStock,
        stores_with_stock: storeCount,
        avg_per_store: storeCount > 0 ? Math.round(totalStock / storeCount) : 0,
        price: product.price || null,
        sales: product.sales || 0,
    };
}

/**
 * Get multiple products' stock at once
 */
export async function getBulkAggregateStock(productIds: string[]): Promise<Map<string, {
    total_stock: number;
    stores_with_stock: number;
}>> {
    const results = new Map();

    // Algolia allows batch gets via search with objectIDs filter
    const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-Algolia-Application-Id': ALGOLIA_APP_ID,
            'X-Algolia-API-Key': ALGOLIA_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: '',
            filters: productIds.map(id => `objectID:${id}`).join(' OR '),
            hitsPerPage: productIds.length,
            attributesToRetrieve: ['objectID', 'stock', 'storetotal', 'totalStock'],
        }),
    });

    if (!response.ok) {
        return results;
    }

    const data: AlgoliaResponse = await response.json();

    for (const hit of data.hits) {
        results.set(hit.objectID, {
            total_stock: hit.stock || hit.totalStock || 0,
            stores_with_stock: hit.storetotal || 0,
        });
    }

    return results;
}

// Export credentials for direct use if needed
export const ALGOLIA_CONFIG = {
    appId: ALGOLIA_APP_ID,
    apiKey: ALGOLIA_API_KEY,
    index: ALGOLIA_INDEX,
};
