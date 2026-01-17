
import { ALGOLIA_CONFIG } from '../src/lib/algoliaClient';

async function debugBadNames() {
    console.log('Probing "JL Pharma" for alternative name fields...');

    const indexUrl = `https://${ALGOLIA_CONFIG.appId}-dsn.algolia.net/1/indexes/${ALGOLIA_CONFIG.index}/query`;

    try {
        const response = await fetch(indexUrl, {
            method: 'POST',
            headers: {
                'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
                'X-Algolia-API-Key': ALGOLIA_CONFIG.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'JL Pharma', // Search for the "bad" name
                hitsPerPage: 5
            }),
        });

        const data: any = await response.json();

        console.log(`Found ${data.hits.length} hits.`);

        for (const hit of data.hits) {
            console.log('\n---------------------------------------------------');
            console.log(`ID: ${hit.objectID}`);
            console.log(`Current Used Name (description): "${hit.description}"`);
            console.log(`Brand: "${hit.brand}"`);
            console.log(`Name field: "${hit.name}"`);
            console.log(`Meta Title SEO: "${hit.metatituloSEO}"`);
            console.log(`Meta Desc SEO: "${hit.metadesSEO}"`);
            console.log(`URL: "${hit.url}"`);
            console.log(`Original Name (from parsing URL?): ${hit.url ? hit.url.split('/').pop() : 'N/A'}`);
            console.log('---------------------------------------------------');
        }

    } catch (e) {
        console.error(e);
    }
}

debugBadNames();
