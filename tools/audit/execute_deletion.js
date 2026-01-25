const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '../../audit_report.md');
const reportContent = fs.readFileSync(reportPath, 'utf-8');

// Extract file paths from markdown list items "- [ ] path/to/file"
const lines = reportContent.split('\n');
const filePaths = lines
    .filter(line => line.trim().startsWith('- [ ]'))
    .map(line => line.match(/- \[ \] (.*)/)[1].trim());

console.log(`🗑️ Found ${filePaths.length} files to delete.`);

let deletedCount = 0;
let errorCount = 0;

filePaths.forEach(relativePath => {
    const fullPath = path.join(__dirname, '../../', relativePath);
    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`✅ Deleted: ${relativePath}`);
            deletedCount++;
        } else {
            console.log(`⚠️ Skipped (Not Found): ${relativePath}`);
        }
    } catch (err) {
        console.error(`❌ Error deleting ${relativePath}: ${err.message}`);
        errorCount++;
    }
});

console.log(`\n🎉 Purge Complete. Deleted: ${deletedCount}, Errors: ${errorCount}`);
