const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../../data/project_file_inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

console.log(`Analyzing ${inventory.length} files...`);

// Categorization Rules
const candidates = {
    debug: [],
    temp: [],
    check: [],
    logs: [],
    unknown_root_scripts: []
};

inventory.forEach(file => {
    const name = file.name.toLowerCase();
    const p = file.path;

    if (p.startsWith('node_modules') || p.startsWith('.git')) return;

    if (name.startsWith('debug_') || name.startsWith('debug-')) candidates.debug.push(p);
    else if (name.startsWith('temp_') || name.startsWith('test_')) candidates.temp.push(p);
    else if (name.startsWith('check_')) candidates.check.push(p);
    else if (name.endsWith('.log') || name.endsWith('output.txt')) candidates.logs.push(p);
    else if (path.dirname(p) === '.' && (name.endsWith('.js') || name.endsWith('.py'))) {
        // Root scripts that are not "next.config.js" etc.
        const keepers = ['next.config.ts', 'next.config.js', 'postcss.config.mjs', 'tailwind.config.ts', 'middleware.ts'];
        if (!keepers.includes(file.name)) {
            candidates.unknown_root_scripts.push(p);
        }
    }
});

let report = `# AI System Audit Report

## 🗑️ Candidates for Deletion
These files appear to be temporary, debug, or obsolete.

### 🐞 Debug Files (${candidates.debug.length})
${candidates.debug.map(f => `- [ ] ${f}`).join('\n')}

### 🧪 Temp/Test Files (${candidates.temp.length})
${candidates.temp.map(f => `- [ ] ${f}`).join('\n')}

### 🔍 Check Scripts (${candidates.check.length})
${candidates.check.map(f => `- [ ] ${f}`).join('\n')}

### 📜 Logs & Outputs (${candidates.logs.length})
${candidates.logs.map(f => `- [ ] ${f}`).join('\n')}

### 📂 Unclassified Root Scripts (${candidates.unknown_root_scripts.length})
*These require manual review or AI confirmation.*
${candidates.unknown_root_scripts.map(f => `- [ ] ${f}`).join('\n')}
`;

fs.writeFileSync(path.join(__dirname, '../../audit_report.md'), report);
console.log('✅ Audit Report Generated at audit_report.md');
