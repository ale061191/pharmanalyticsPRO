# Farmatodo Stock API Research - Summary

## Completed: 2026-01-16

### Discovery Results

#### 1. Algolia Direct Access ✅
- **Index**: `products` (NOT `products-venezuela`)
- **App ID**: `VCOJEYD2PO`
- **API Key**: `869a91e98550dd668b8b1dc04bca9011`

#### 2. Available Stock Fields from Algolia
| Field | Description | Example |
|-------|-------------|---------|
| `stock` | Total national stock | 336 |
| `totalStock` | Confirmed stock | 336 |
| `storetotal` | Number of stores with stock | 15 |
| `storecero` | Stores without stock | 0 |
| `avg_stock` | Average stock per store | 1120 |
| `totalmax_stock` | Max stock per store | 30 |
| `without_stock` | Out of stock flag | false |

#### 3. Transactional API Endpoints
- **Cities**: `GET /catalog/r/VE/v1/cities/active/geo-zone/`
  - Returns 56 active cities with default store IDs
  
- **Nearby Stores**: `GET /route/r/VE/v1/stores/nearby?cityId={CITY_ID}`
  - Returns stores for a specific city

#### 4. Limitation Discovered
⚠️ **Per-store stock** (exact inventory per location) is NOT available via API.
The map popup on the product page shows availability by store, but:
- Requires browser interaction (click on map markers)
- Anti-bot protection detected
- Data is dynamically loaded per interaction

### Files Created
- `farmatodo_stock_scraper.py` - Complete scraper combining Algolia + API
- `product_stock_data.json` - Sample output with stock data
- `algolia_product_full.json` - Raw Algolia product response
- `captured_stock_responses.json` - All intercepted API calls

### Recommendation
For the ranking system, the **aggregated stock data** from Algolia is sufficient:
- Use `storetotal` to rank products by availability distribution
- Use `stock` for total inventory tracking
- Use `without_stock` flag to identify out-of-stock items

To get per-store granularity, would require:
- Playwright with anti-bot bypass (stealth mode)
- Manual map interaction for each product
- Significantly slower scraping (~5 sec per product)
