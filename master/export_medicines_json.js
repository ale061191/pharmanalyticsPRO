
const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, 'data', 'pharmacy_catalog_final.json');
const OUTPUT_FILE = path.join(__dirname, 'medicamentos_candidatos_atc.md');

function exportList() {
    console.log(`Reading ${JSON_FILE}...`);
    const products = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

    // Filter strictly for verified 1854
    const medications = products.filter(p => p.category === 'Medicamentos');

    console.log(`Found ${medications.length} medications.`);

    let mdContent = `# Lista de Candidatos para ATC / Vademecum\n\n`;
    mdContent += `Total encontrados: ${medications.length}\n\n`;
    mdContent += `| ID | Producto | Marca | ATC Actual | Principio Activo Actual |\n`;
    mdContent += `|--- |--- |--- |--- |--- |\n`;

    medications.forEach(p => {
        const name = (p.name || p.mediaDescription || p.description || '').replace(/\|/g, '-').trim();
        const brand = (p.brand || 'N/A').replace(/\|/g, '-');
        const atc = (p.atc_code || 'N/A').replace(/\|/g, '-');
        const active = (p.active_ingredient || 'N/A').replace(/\|/g, '-').substring(0, 50);

        mdContent += `| ${p.id} | ${name} | ${brand} | ${atc} | ${active} |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, mdContent, 'utf8');
    console.log(`Exported matched list to ${OUTPUT_FILE}`);
}

exportList();
