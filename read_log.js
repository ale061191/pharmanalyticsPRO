const fs = require('fs');
try {
    const content = fs.readFileSync('sync_log.txt', 'utf16le');
    console.log(content);
} catch (e) {
    console.error(e);
}
