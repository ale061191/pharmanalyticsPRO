
const http = require('http');

http.get('http://localhost:3000/api/filters/options', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const labs = json.data.labs;
            console.log('--- API DEBUG REPORT ---');
            console.log('Total Labs:', labs.length);
            console.log('Includes Pfizer:', labs.includes('Pfizer'));
            console.log('Includes Leti:', labs.includes('Leti'));
            console.log('Includes Sanofi:', labs.includes('Sanofi'));
            console.log('First 10:', labs.slice(0, 10));
            console.log('Last 10:', labs.slice(-10));
        } catch (e) {
            console.log('FAIL:', e.message);
            console.log('Raw data sample:', data.slice(0, 100));
        }
    });
}).on('error', (err) => {
    console.log('Error: ' + err.message);
});
