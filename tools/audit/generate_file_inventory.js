const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../../');
const outputFile = path.join(__dirname, '../../data/project_file_inventory.json');

function scanDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        if (file.startsWith('node_modules') || file.startsWith('.git') || file.startsWith('.next')) return;

        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDir(filePath, fileList);
        } else {
            fileList.push({
                path: path.relative(rootDir, filePath),
                name: file,
                size: stat.size,
                mtime: stat.mtime
            });
        }
    });

    return fileList;
}

const inventory = scanDir(rootDir);
fs.writeFileSync(outputFile, JSON.stringify(inventory, null, 2));

console.log(`Inventory created with ${inventory.length} files at ${outputFile}`);
