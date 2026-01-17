
import * as dotenv from 'dotenv';
import { ALGOLIA_CONFIG } from '../src/lib/algoliaClient';

dotenv.config({ path: '.env.local' });

async function probe() {
    console.log('Probing Algolia...');
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
                query: '',
                hitsPerPage: 1
            }),
        });

        const data: any = await response.json();
        const hit = data.hits[0];

        console.log('Raw Hit Data:');
        console.log(JSON.stringify(hit, null, 2));

    } catch (e) {
        console.error(e);
    }
}

probe();
