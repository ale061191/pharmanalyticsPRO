// Native fetch


const CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    index: 'products'
};

/*
    Algolia Filter Syntax:
    filters: 'attribute:value' OR 'attribute > value'
*/

async function testFilter() {
    const url = `https://${CONFIG.appId}-dsn.algolia.net/1/indexes/${CONFIG.index}/query`;

    // Test without filter
    const bodyNoFilter = {
        query: 'atamel',
        hitsPerPage: 1
    };

    // Test WITH filter for PRICE (Old Currency detection)
    const bodyWithFilter = {
        query: 'a', // Generic
        filters: 'fullPrice > 1000000',
        hitsPerPage: 1
    };

    try {
        console.log('--- TEST SIN FILTRO ---');
        const res1 = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify(bodyNoFilter) });
        const json1 = await res1.json();
        console.log(`Hits: ${json1.nbHits}`);
        if (json1.hits[0]) console.log(`Sample SG: ${json1.hits[0].idStoreGroup}`);

        console.log('\n--- TEST CON FILTRO (idStoreGroup=703 OR 701) ---');
        const res2 = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify(bodyWithFilter) });
        const json2 = await res2.json();
        console.log(`Hits: ${json2.nbHits}`);
        if (json2.hits[0]) console.log(`Sample SG: ${json2.hits[0].idStoreGroup}`);

        if (json2.status === 400) {
            console.log('ERROR: Filter not allowed (Attribute not in attributesForFaceting?)');
            console.log(json2.message);
        }

    } catch (e) {
        console.log(e);
    }
}

function getHeaders() {
    return {
        'X-Algolia-Application-Id': CONFIG.appId,
        'X-Algolia-API-Key': CONFIG.apiKey,
        'Content-Type': 'application/json',
    };
}

testFilter();
