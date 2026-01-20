
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'algolia_products.json');
const OUT_FILE = path.join(__dirname, 'db_sample_report.txt');

try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const products = JSON.parse(raw);

    const categories = {};
    products.forEach(p => {
        if (p.category && !categories[p.category]) {
            categories[p.category] = p;
        }
    });

    const samples = Object.values(categories).slice(0, 10);

    let report = "====== REPORTE BD LOCAL (MUESTRA 1 POR CATEGORÍA) ======\n";
    report += `Total Productos en BD: ${products.length}\n`;
    report += "Nota: El stock granular (por ciudad/tienda/unidades) se cargará en la fase masiva.\n\n";

    samples.forEach((p, i) => {
        report += `${i + 1}. [${p.category}]\n`;
        report += `   Producto: ${p.name}\n`;
        report += `   ID: ${p.id}\n`;
        report += `   Marca: ${p.brand}\n`;
        report += `   Departamento: ${p.department} -> Sub: ${p.subcategory}\n`;

        const price = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(p.price_real);
        const full = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(p.price_full);

        report += `   Precio: ${price} (Full: ${full}) -> Dcto: ${p.discount_percent}%\n`;
        report += `   Disponibilidad General: En ${p.stock_stores_count} tiendas a nivel nacional.\n`;
        report += "------------------------------------------------\n";
    });

    fs.writeFileSync(OUT_FILE, report);
    console.log("Report generated successfully.");

} catch (e) {
    console.error("Error:", e.message);
}
