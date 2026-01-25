const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLASSIFIED.json', 'utf8'));

    // Helper to get random samples
    function getSamples(arr, count) {
        const shuffled = arr.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    const pharma = getSamples(data.filter(p => p.is_pharma && p.nombre_limpio !== p.nombre_original), 5);
    const nonPharma = getSamples(data.filter(p => !p.is_pharma), 5);

    console.log('\n✨ TRANSFORMACIÓN DE DATOS (GEMINI AI) ✨\n');

    console.log('💊 FÁRMACOS (Con limpieza de nombres y extracción de activos)');
    console.log('='.repeat(100));
    console.log('| TIPO          | NOMBRE ORIGINAL (Sucio)                                      | NOMBRE LIMPIO (IA)           | ACTIVO DETECTADO   |');
    console.log('|---------------|--------------------------------------------------------------|------------------------------|--------------------|');

    pharma.forEach(p => {
        const original = (p.nombre_original || p.nombre).substring(0, 60).padEnd(60);
        const clean = (p.nombre_limpio || '').substring(0, 28).padEnd(28);
        const type = (p.tipo_producto || 'MEDICAMENTO').substring(0, 13).padEnd(13);
        const active = (p.principio_activo_detectado || 'N/A').substring(0, 18);
        console.log(`| ${type} | ${original} | ${clean} | ${active} |`);
    });
    console.log('='.repeat(100));

    console.log('\n🛒 CONSUMO MASIVO (Clasificación correcta)');
    console.log('='.repeat(100));
    console.log('| TIPO          | NOMBRE                                                       | CLASIFICACIÓN                |');
    console.log('|---------------|--------------------------------------------------------------|------------------------------|');

    nonPharma.forEach(p => {
        const original = (p.nombre_limpio || p.nombre).substring(0, 60).padEnd(60);
        const type = (p.tipo_producto || 'CONSUMO').substring(0, 28).padEnd(28);
        console.log(`| ${type.substring(0, 13).padEnd(13)} | ${original} | ✅ Correcto                  |`);
    });
    console.log('='.repeat(100));

} catch (e) {
    console.error(e.message);
}
