const fs = require('fs');
const path = require('path');

const inputFile = 'Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLASSIFIED.json';
// Output to the artifacts directory
const outputFile = 'C:/Users/Usuario/.gemini/antigravity/brain/f7e788de-2198-4bcc-b9ce-7411a49eed63/pharma_classification_report.md';

try {
    if (!fs.existsSync(inputFile)) {
        console.error('Input file not found');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    // Filter only confirmed pharma
    const pharma = data.filter(p => p.is_pharma);

    // Sort interesting ones first (those where name changed significantly)
    pharma.sort((a, b) => {
        const aDiff = Math.abs((a.nombre_original || a.nombre).length - (a.nombre_limpio || '').length);
        const bDiff = Math.abs((b.nombre_original || b.nombre).length - (b.nombre_limpio || '').length);
        return bDiff - aDiff;
    });

    // Take top 100 most "cleaned" examples
    const sample = pharma.slice(0, 100);

    let md = '# 💊 Reporte de Clasificación Farmacológica (Top 100 Transformaciones)\n\n';
    md += `**Total Fármacos Detectados:** ${pharma.length} de ${data.length} productos procesados.\n\n`;
    md += 'Este reporte destaca los productos donde la limpieza del nombre fue más significativa.\n\n';

    md += '| Tipo | Nombre Limpio (IA) | Principio Activo | Nombre Original (Farmatodo) |\n';
    md += '|---|---|---|---|\n';

    sample.forEach(p => {
        const type = p.tipo_producto || 'MEDICAMENTO';
        const original = (p.nombre_original || p.nombre).replace(/\|/g, '').trim();
        const clean = (p.nombre_limpio || '').replace(/\|/g, '').trim();
        const active = (p.principio_activo_detectado || 'N/A').replace(/\|/g, '').trim();

        md += `| ${type} | **${clean}** | *${active}* | ${original} |\n`;
    });

    fs.writeFileSync(outputFile, md);
    console.log('Markdown report generated successfully.');

} catch (e) {
    console.error('Error generating report:', e);
}
