# Farmatodo APK Reverse Engineering Results

## 🚀 Overview
This folder contains the extracted endpoints, secrets, and configuration found in the `Farmatodo Venezuela.apk` file.

### Files
### Phase 3: Ninja Ghost Reconnaissance (Web & Sitemap)
**Objective**: Extract all product data without detection.
**Method**: Hybrid "Sitemap + Optimized Headless Browser".

**Findings**:
1.  **Sitemap Vulnerability**: Found `https://www.farmatodo.com.ve/sitemap-products.xml` which lists **19,000+** direct product URLs. This bypasses the need to crawl the catalog pages or guess IDs.
2.  **Web Scraping (DOM)**: The website uses Server-Side Rendering (or fast client hydration), making data available in the DOM (`h1` for name, `span.box__price--current` for price).
3.  **Existing OSINT**: Analyzed `farmatodo.py` (from GitHub) and improved upon its unauthorized brute-force method by using the sitemap.

**New Tools & Artifacts**:
*   `extracted_data/product_urls.txt`: Complete list of 19,153 product URLs.
*   `extracted_data/farmatodo_products_full.csv`: Sample extracted data (Name, Price, Stock, Invima).
*   `sitemap_parser.py`: Script to update the URL list.
*   `ninja_scraper.py`: Highly optimized, concurrent scraper that:
    *   Uses `playwright` (async) for stealth.
    *   Blocks images/media for speed.
    *   Targets specific DOM elements for Name, Price, Invima code.
    *   Check `extracted_data/` for results.

### MITM & Private API (Optional)
If the web data is insufficient (e.g. need real-time warehouse stock), see `MITM_GUIDE.md` for intercepting the mobile app's private API.


### Files in this Repository
*   `sitemap_parser.py`: Harvester for all product URLs.
*   `ninja_scraper.py`: The "Perfect Scraper" for mass data collection.
*   `farmatodo_master_scraper.py`: (Legacy) Catalog-based scraper.
*   `test_endpoints.py`: Connectivity tester for known endpoints.
*   `MITM_GUIDE.md`: Guide for advanced mobile interception.
*   `extracted_data/`: Folder containing the scraped data and URL lists.
*   `ALL_FARMATODO_ENDPOINTS.txt`: Raw consolidated list of all interesting strings (URLs, Keys).
*   `endpoints.json`: Structured list of endpoints.
*   `endpoints.csv`: Table view of endpoints.

## 🔑 Key Findings

### 1. Firebase Realtime Database
- **URL**: `https://oracle-services-vzla.firebaseio.com`
- **Status**: Needs verification. If open, it could expose sensitive data.
- **Related Storage**: `oracle-services-vzla.appspot.com`

### 2. API Keys
A set of API keys was found in `res/values/strings.xml`:
- **Google API Key**: `AIzaSyCFM...` (Potentially unrestricted)
- **Braze (Marketing)**: Multiple keys for VE, CO, AR.
- **Kustomer (Support)**: Full JWT token found for production.

### 3. Application Structure
The app is built with **Flutter**.
- Logic is compiled into `libapp.so` (Dart AOT), making static analysis of business logic difficult without binary tools.
- Configuration is heavily stored in `strings.xml` and `AndroidManifest.xml`.
- It uses **Yuno** for payments and **Mapbox** for maps.

## 🛠 Usage
1. Review `endpoints.json` to integrate with your bot.
2. Run `python test_endpoints.py` to check which URLs are alive.
3. Use the Kustomer token to potentially query support APIs (Use with caution & authorization).
