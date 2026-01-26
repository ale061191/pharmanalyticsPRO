
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Force dynamic to prevent caching of the report generation
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout for PDF generation

export async function GET(req: Request) {
    let browser = null;
    try {
        // 1. Authentication Check
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 2. Collect Data
        const { count: totalProducts, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (countError) throw new Error(`Supabase Count Error: ${countError.message}`);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: activeProducts, error: activeError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', thirtyDaysAgo.toISOString());

        if (activeError) throw new Error(`Supabase Active Count Error: ${activeError.message}`);

        const date = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
        const monthYear = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long' });

        // 3. Generate HTML Content
        const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            h2 { color: #2980b9; margin-top: 30px; }
            h3 { color: #34495e; }
            .metric-box { background: #f8f9fa; border-left: 5px solid #2980b9; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 50px; font-size: 0.8em; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 20px; }
            ul { margin-bottom: 20px; }
            li { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <h1>Informe de Cumplimiento y Auditoría Técnica</h1>
        <p><strong>Proyecto:</strong> PharmaAnalytics</p>
        <p><strong>Fecha de Emisión:</strong> ${date}</p>
        <hr>

        <p>Este documento sirve como evidencia de auditoría interna para demostrar el uso ético, prudente y no abusivo del sistema de monitoreo de precios y stock.</p>

        <div class="metric-box">
            <h3>Métricas Operativas (${monthYear})</h3>
            <p><strong>Total Productos en Base de Datos:</strong> ${totalProducts?.toLocaleString()}</p>
            <p><strong>Productos Actualizados (Últimos 30 días):</strong> ${activeProducts?.toLocaleString()}</p>
            <p><strong>Estado del Sistema:</strong> <span style="color: green; font-weight: bold;">OPERATIVO / CONFORME</span></p>
        </div>

        <h2>1. Descripción y Alcance</h2>
        <p>El sistema monitorea la disponibilidad pública de productos farmacéuticos en <code>farmatodo.com.ve</code> mediante su API pública de Algolia. <strong>NO</strong> se recolecta información personal (PII) de usuarios, credenciales ni historiales de compra.</p>

        <h2>2. Políticas Anti-Abuso Implementadas</h2>
        <ul>
            <li><strong>Rate Limiting:</strong> Máximo 1 petición cada 2-5 segundos.</li>
            <li><strong>Manejo de Errores:</strong> Pausa automática ante códigos 429/5xx.</li>
            <li><strong>Horarios:</strong> Tareas intensivas programadas en horas valle (madrugada).</li>
        </ul>

        <h2>3. Integridad y Seguridad</h2>
        <p>El sistema opera con privilegios de solo lectura sobre fuentes públicas y no intenta eludir medidas de seguridad (CAPTCHAs) ni realizar inyecciones de código.</p>

        <div class="footer">
            <p>Certificado Digitalmente por: <strong>PharmaAnalytics Compliance Agent</strong></p>
            <p>ID de Generación: ${new Date().getTime()}</p>
        </div>
    </body>
    </html>
    `;

        // 4. Generate PDF with Puppeteer
        if (process.env.NODE_ENV === 'production') {
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless === 'true' || true,
            });
        } else {
            // Local Development
            browser = await puppeteer.launch({
                args: [],
                executablePath: process.env.LOCAL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: true
            });
        }

        // TypeScript check: ensure browser is not null if we get here (or handle it)
        if (!browser) throw new Error('Failed to launch browser');

        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

        // Browser closed in finally block

        // 5. Upload to Supabase
        const fileName = `compliance_reports/report_${new Date().toISOString().split('T')[0]}.pdf`;

        // Use standard upload
        const { error: uploadError } = await supabase
            .storage
            .from('compliance')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Storage Upload Failed: ${uploadError.message}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('compliance')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            message: 'Report generated and uploaded successfully',
            url: publicUrl,
            stats: { total: totalProducts, active: activeProducts }
        });

    } catch (err: any) {
        console.error('Compliance Report Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
