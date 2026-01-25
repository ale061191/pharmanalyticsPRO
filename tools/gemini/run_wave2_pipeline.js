const { spawn } = require('child_process');
const path = require('path');

const scripts = [
    'tools/gemini/clean_wave2.js',
    'tools/gemini/classify_wave2.js',
    'tools/gemini/sync_wave2_to_db.js'
];

async function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Iniciando: ${scriptPath}`);
        console.log('='.repeat(50));

        const process = spawn('node', [scriptPath], {
            cwd: path.join(__dirname, '../../'), // Run from root
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ Completado: ${scriptPath}`);
                resolve();
            } else {
                console.error(`\n❌ Falló: ${scriptPath} (Código: ${code})`);
                reject(new Error(`Script exited with code ${code}`));
            }
        });
    });
}

async function main() {
    console.log('🦾 INICIANDO SUPER-CADENA DE IA (WAVE 2)\n');

    try {
        for (const script of scripts) {
            await runScript(script);
        } // Wait 5 seconds between steps just in case
        await new Promise(r => setTimeout(r, 5000));

        console.log('\n✨✨ CADENA COMPLETADA EXITOSAMENTE ✨✨');
    } catch (e) {
        console.error('\n💀 La cadena se detuvo por un error.');
        process.exit(1);
    }
}

main();
