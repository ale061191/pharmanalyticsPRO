/**
 * price_normalizer.js
 * 
 * Utility module for normalizing Farmatodo product prices.
 * 
 * PROBLEM: Algolia API returns prices like 70.80 (Bolívares)
 * but some scrapers stored them as 7080 (multiplied by 100).
 * 
 * This module provides functions to:
 * 1. Normalize prices from any source
 * 2. Validate price ranges
 * 3. Auto-detect and fix malformed prices
 * 
 * Use this in all scraping workflows to ensure consistent pricing.
 */

// Expected price range for Farmatodo products (in Bolívares)
const PRICE_THRESHOLDS = {
    MIN: 0.01,        // Minimum valid price
    MAX: 50000,       // Maximum reasonable price (50K Bs)
    SUSPICION: 1000,  // Prices above this need verification
    LIKELY_MULTIPLIED: 5000  // If price > this, likely needs /100
};

/**
 * Normalize a price from Algolia/Farmatodo API
 * @param {number|string} rawPrice - The raw price value
 * @param {string} source - Source identifier ('algolia', 'firecrawl', 'api')
 * @returns {number} Normalized price
 */
function normalizePrice(rawPrice, source = 'unknown') {
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
        console.warn(`⚠️ Invalid price value: ${rawPrice} from ${source}`);
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
                console.log(`🔧 Auto-corrected price: ${price} → ${corrected} (from ${source})`);
                return corrected;
            }
        }
    }

    // Validate price range
    if (price < PRICE_THRESHOLDS.MIN) {
        console.warn(`⚠️ Price too low: ${price} from ${source}`);
        return 0;
    }

    if (price > PRICE_THRESHOLDS.MAX) {
        console.warn(`⚠️ Price suspiciously high: ${price} from ${source}`);
        // Still return it, but log warning
    }

    return Math.round(price * 100) / 100; // Round to 2 decimals
}

/**
 * Normalize an Algolia product hit
 * @param {Object} hit - Algolia product hit
 * @returns {Object} Normalized product data
 */
function normalizeAlgoliaProduct(hit) {
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

/**
 * Clean product name (remove prefixes like !! or //)
 * @param {string} name - Raw product name
 * @returns {string} Cleaned name
 */
function cleanProductName(name) {
    if (!name) return 'Producto';
    return name.replace(/^[!\\/]+\s*/, '').trim();
}

/**
 * Extract lab/brand name from product hit
 * @param {Object} hit - Algolia product hit
 * @returns {string|null} Lab name or null
 */
function extractLabName(hit) {
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

/**
 * Batch normalize an array of products
 * @param {Array} products - Array of raw product data
 * @param {string} source - Source identifier
 * @returns {Array} Array of normalized products
 */
function normalizeProductBatch(products, source = 'unknown') {
    return products.map(p => {
        if (source === 'algolia') {
            return normalizeAlgoliaProduct(p);
        }

        // Generic normalization
        return {
            ...p,
            avg_price: normalizePrice(p.avg_price || p.price || p.offerPrice, source),
            original_price: normalizePrice(p.original_price || p.fullPrice, source),
            name: cleanProductName(p.name || p.description)
        };
    });
}

/**
 * Validate a product before database insert
 * @param {Object} product - Normalized product
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateProduct(product) {
    const errors = [];

    if (!product.name || product.name === 'Producto') {
        errors.push('Missing product name');
    }

    if (!product.avg_price || product.avg_price <= 0) {
        errors.push('Invalid average price');
    }

    if (product.avg_price > PRICE_THRESHOLDS.SUSPICION) {
        errors.push(`Price ${product.avg_price} is suspiciously high`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Export for use in other modules
module.exports = {
    normalizePrice,
    normalizeAlgoliaProduct,
    normalizeProductBatch,
    cleanProductName,
    extractLabName,
    validateProduct,
    PRICE_THRESHOLDS
};

// CLI usage for testing
if (require.main === module) {
    console.log('🧪 Testing Price Normalizer...\n');

    // Test cases
    const testPrices = [
        { raw: 7080, expected: 70.80, source: 'old_db' },
        { raw: 76.50, expected: 76.50, source: 'algolia' },
        { raw: '123.45', expected: 123.45, source: 'string' },
        { raw: 0, expected: 0, source: 'zero' },
        { raw: null, expected: 0, source: 'null' },
        { raw: 99999, expected: 999.99, source: 'very_high' }
    ];

    testPrices.forEach(test => {
        const result = normalizePrice(test.raw, test.source);
        const status = Math.abs(result - test.expected) < 0.01 ? '✅' : '❌';
        console.log(`${status} ${test.raw} → ${result} (expected: ${test.expected})`);
    });
}
