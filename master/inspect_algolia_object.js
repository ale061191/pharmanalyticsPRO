
const algoliasearch = require('algoliasearch');

const client = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');
const index = client.initIndex('products-venezuela');

const ID = '113308360'; // The Alcohol Spray from the screenshot

index.getObject(ID).then(content => {
    console.log(JSON.stringify(content, null, 2));
}).catch(err => {
    console.error(err);
});
