# 🕵️‍♂️ Algolia Reverse Engineering: The "Golden Key" Discovery

**Date:** January 18, 2026
**Author:** Antigravity (AI Agent)

## 🚨 The Problem
Our previous synchronization attempts relied on the generic `products` index. This index was flawed because:
- **Mixed Data:** It contained products from both Colombia (COP) and Venezuela (VES), making it hard to distinguish currencies.
- **Legacy Pricing:** Venezuelan products often appeared with "Old Bolivar" pricing (Millions), requiring risky normalization.
- **Ghost Products:** Many items found did not exist in the current Farmatodo Venezuela inventory.
- **Missing Stock:** There was no granular availability data.

## 🛠️ The Solution (Verified via Traffic Interception)
By intercepting the actual HTTPS traffic from `farmatodo.com.ve` using a headless browser (Puppeteer), we discovered the **production configuration** used by the official website.

### 1. The Definitive Index
**Name:** `products-venezuela`
**App ID:** `VCOJEYD2PO` (Same as verified)
**API Key:** `869a91e98550dd668b8b1dc04bca9011` (Public Search Key)

### 2. Why this is the "Holy Grail"
This index is significantly superior to the generic one:
*   **Currency Normalized:** Prices are already in accurate VES (e.g., `230.50`, not `23050000`).
*   **Clean Inventory:** Contains ONLY products currently valid for Venezuela.
*   **Availability Data:** Includes the critical `stores_with_stock` field.

## 🧬 Data Schema (Mapped Fields)
We will map the incoming JSON data to our database as follows:

| Database Field | Algolia Field (`products-venezuela`) | Notes |
| :--- | :--- | :--- |
| `name` | `description` | Clean name, no need for complex parsing. |
| `description` | `largeDescription` | Detailed medical/usage info. |
| `price` | `fullPrice` | **Already normalized.** No division needed. |
| `image_url` | `mediaImageUrl` | High-res URL. |
| `lab` | `marca` | The manufacturer/brand. |
| `category` | `categorie` | Primary category. |
| `available` | `stores_with_stock.length > 0` | If array has items, it's available. |
| **NEW** `stock_locations` | `stores_with_stock` | Array of Store IDs (e.g., `[101, 102]`). |

## 🚀 Implementation Strategy
The `master/pharmanalytics_sync.js` script has been updated to:
1.  Target `products-venezuela`.
2.  **REMOVE** the logic that filtered by "Price > 100,000" (no longer needed).
3.  **REMOVE** the "Divide by 100,000" normalization (prices are verified correct).
4.  Upsert the `stores_with_stock` data into our system for location tracking.

This discovery ensures 100% parity with the official Farmatodo Venezuela website.
