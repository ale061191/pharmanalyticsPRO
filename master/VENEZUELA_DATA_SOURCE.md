# Farmatodo Venezuela Data Source & API Documentation

## Overview
This document serves as the single source of truth for the Farmatodo Venezuela data extraction process used in Pharmanalytics. It details the API credentials, endpoints, logic, and filtering criteria discovered and verified during the development process.

## 🔑 Algolia Credentials
These credentials are used to access the specific index containing Venezuelan product inventory.

- **Application ID:** `VCOJEYD2PO`
- **API Key:** `869a91e98550dd668b8b1dc04bca9011`
- **Host:** `VCOJEYD2PO-dsn.algolia.net` / `https://VCOJEYD2PO-dsn.algolia.net`

## 📦 Indices
Through exhaustive testing, the following index status was determined:
- **`products`** (✅ **ACTIVE**): The primary index. **IMPORTANT:** It contains mixed data from Colombia and Venezuela (Historic/Old Currency). Strict filtering is REQUIRED.
- `products-vzla` (❌ Forbidden): Returns 403 Forbidden with the current key.

## 🔍 Data Structure & Extraction Logic
The `products` index returns raw JSON objects. We map these fields to our database as follows:

| Field Name | Algolia Source Field(s) | Notes |
| :--- | :--- | :--- |
| **Name** | `description` + `detailDescription` | Combined to get full name + dosage (e.g., "Losartan" + "50mg Tab"). "!!" and "//" prefixes are cleaned. |
| **Lab/Brand** | `marca` > `supplier` > `manufacturer` | Priority order. `marca` is usually the most accurate lab (e.g., "MK", "CALOX"). Codes like "2008M..." are filtered out. |
| **Price** | `offerPrice` or `fullPrice` | If `offerPrice` > 0, it is used. Otherwise, `fullPrice`. **Requires Divisor for Old Bs**. |
| **Image** | `mediaImageUrl` | Direct URL to product image. |
| **Category** | `category` or `hierarchicalCategories.lvl0` | Extracted string. |

## 🛡️ STRICT Filtering for Venezuela
To separate Venezuelan products from Colombian ones in the mixed index:

1.  **Store Group ID (`idStoreGroup`):**
    *   **Venezuela:** `701`, `703`. (Contains Calox, Genven, Leti).
    *   **Colombia:** `86`, `1190`, `1149`, `1184`.
    *   **Rule:** ACCEPT ONLY if `idStoreGroup` is `701` or `703`.

2.  **Barcode (`barcode`):**
    *   **Venezuela:** Starts with `759`.
    *   **Colombia:** Starts with `770` or `745` (Panama/Regional).
    *   **Rule:** ACCEPT if barcode starts with `759`.

## 💰 Price Normalization (Old Bolívares)
The Venezuelan data in this index appears to use **Old Bolívares (Bs.S approx)** or "Extended Bolívares" where prices are in the Millions.
*   Example: `Acetaminofen Genven` = `2,384,000`
*   Example: `Fulbaryl` = `77,280,000`

**Normalization Logic:**
- If `price > 1,000,000`: Divide by **1,000,000** (or tentatively 100,000 pending validation of "cheapness").
    - Current Script uses **/ 100,000** to produce conservative estimates in range $0.50 - $20.00.
    - If `price > 10,000` (Colombia style): Divide by **100**.

## 🔄 Sync Automation
The master script is located at `master/pharmanalytics_sync.js`.
It is designed to run via cron (e.g., `0 2 * * *`) every night.
It performs a **Database Wipe** of non-system products before syncing to ensure no "ghost" Colombian products remain.

*Last Updated: 2026-01-17 (Strict Vzla Filter Applied)*
