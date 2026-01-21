const https = require('https');
const fs = require('fs');
const path = require('path');

const url = "https://raw.githubusercontent.com/fabkury/atcd/master/WHO%20ATC-DDD%202021-12-03.csv";
const dest = path.join(__dirname, '..', 'data', 'atc_reference.csv');

// Ensure data dir exists
if (!fs.existsSync(path.dirname(dest))) {
    fs.mkdirSync(path.dirname(dest));
}

console.log(`Downloading ${url} to ${dest}...`);

const file = fs.createWriteStream(dest);
https.get(url, function (response) {
    if (response.statusCode !== 200) {
        console.error(`Failed to download: ${response.statusCode}`);
        return;
    }
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => {
            console.log("Download completed.");
        });
    });
}).on('error', function (err) { // Handle errors
    fs.unlink(dest, () => { }); // Delete the file async. (But we don't check the result)
    console.error(`Error: ${err.message}`);
});
