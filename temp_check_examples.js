const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLASSIFIED.json', 'utf8'));

    // Get last 5 pharma
    const pharma = data.filter(p => p.is_pharma).slice(-5);

    // Get last 5 non-pharma
    const nonPharma = data.filter(p => !p.is_pharma).slice(-5);

    console.log('--- 💊 EJEMPLOS: FÁRMACOS DETECTADOS ---');
    pharma.forEach(p => {
        console.log(`✅ [${p.tipo_producto}] ${p.nombre_limpio || p.nombre}`);
        if (p.principio_activo_detectado) console.log(`   └─ Activo: ${p.principio_activo_detectado}`);
    });

    console.log('\n--- 🛒 EJEMPLOS: CONSUMO MASIVO (NO FÁRMACOS) ---');
    nonPharma.forEach(p => {
        console.log(`❌ [${p.tipo_producto}] ${p.nombre_limpio || p.nombre}`);
    });

} catch (e) {
    console.error('Error:', e.message);
}
