/**
 * Utility module for normalizing Farmatodo product prices.
 * Ported from price_normalizer.js to TypeScript.
 */

// Expected price range for Farmatodo products (in Bolívares)
export const PRICE_THRESHOLDS = {
    MIN: 0.01,        // Minimum valid price
    MAX: 50000,       // Maximum reasonable price (50K Bs)
    SUSPICION: 1000,  // Prices above this need verification
    LIKELY_MULTIPLIED: 5000  // If price > this, likely needs /100
};

/**
 * Clean product name (remove prefixes like !! or //)
 */
export function cleanProductName(name: string | null | undefined): string {
    if (!name) return 'Producto';
    return name.replace(/^[!\\/]+\s*/, '').trim();
}

/**
 * Normalize a price from Algolia/Farmatodo API
 */
export function normalizePrice(rawPrice: number | string | null | undefined, source: string = 'unknown'): number {
    // Handle null/undefined
    if (rawPrice === null || rawPrice === undefined) {
        return 0;
    }

    // Parse string prices
    let price = typeof rawPrice === 'string'
        ? parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.'))
        : Number(rawPrice);

    // Validate it's a number
    if (isNaN(price) || !isFinite(price)) {
        // console.warn(`⚠️ Invalid price value: ${rawPrice} from ${source}`);
        return 0;
    }

    // Auto-detect if price was stored as whole number (x100)
    // Heuristic: if price > 5000 and ends in .00, likely needs division
    if (price > PRICE_THRESHOLDS.LIKELY_MULTIPLIED) {
        // Check if it looks like a scaled integer price
        // e.g., 7080 should become 70.80
        const decimalPart = price % 1;
        if (decimalPart === 0 || decimalPart < 0.01) {
            const corrected = price / 100;
            // Only apply if result is reasonable
            if (corrected >= PRICE_THRESHOLDS.MIN && corrected <= PRICE_THRESHOLDS.MAX) {
                // console.log(`🔧 Auto-corrected price: ${price} → ${corrected} (from ${source})`);
                return corrected;
            }
        }
    }

    // Validate price range (warn but return)
    if (price < PRICE_THRESHOLDS.MIN) {
        // console.warn(`⚠️ Price too low: ${price} from ${source}`);
        return 0;
    }

    // if (price > PRICE_THRESHOLDS.MAX) {
    // console.warn(`⚠️ Price suspiciously high: ${price} from ${source}`);
    // }

    return Math.round(price * 100) / 100; // Round to 2 decimals
}

/**
 * Extract lab/brand name from product hit
 */
export function extractLabName(hit: any): string | null {
    // Priority: marca field, then brand field, then parse from description
    const marca = hit.marca;
    const brand = hit.brand;

    // Ignore registry codes like "2008M-0008623"
    if (marca && !/\d{4}[A-Z]-\d+/.test(marca)) {
        return marca;
    }

    if (brand && !/\d{4}[A-Z]-\d+/.test(brand)) {
        return brand;
    }

    return null; // Will show as "Genérico" in frontend
}

export interface NormalizedProduct {
    id: string;
    name: string;
    lab_name: string | null;
    category: string;
    avg_price: number;
    original_price: number;
    image_url: string | null;
    url: string | null;
    stock_count: number;
    rating: number | null;
    review_count: number;
    presentation: string | null;
    brand: string | null;
}

/**
 * Normalize an Algolia product hit
 */
export function normalizeAlgoliaProduct(hit: any): NormalizedProduct {
    return {
        id: hit.objectID || hit.id,
        name: cleanProductName(hit.mediaDescription || hit.description || hit.name || ''),
        lab_name: extractLabName(hit),
        category: hit.categorie || hit.category || 'General',
        avg_price: normalizePrice(hit.offerPrice || hit.fullPrice, 'algolia'),
        original_price: normalizePrice(hit.fullPrice, 'algolia'),
        image_url: hit.mediaImageUrl || hit.imageUrl || null,
        url: hit.url ? `https://www.farmatodo.com.ve/${hit.url}` : null,
        stock_count: parseInt(hit.totalStock || hit.stock || 0),
        rating: parseFloat(hit.rating) || null,
        review_count: parseInt(hit.reviewCount || hit.reviews || 0),
        presentation: hit.presentation || null,
        brand: hit.marca || hit.brand || null
    };
}
