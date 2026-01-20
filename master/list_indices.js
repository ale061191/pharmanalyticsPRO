
const algoliasearch = require('algoliasearch');

const client = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');

client.listIndices().then(({ items }) => {
    console.log(JSON.stringify(items, null, 2));
}).catch(err => {
    console.error(err);
});
