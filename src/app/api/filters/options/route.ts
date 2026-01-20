
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        // Fetch unique labs from view
        const { data: labsData } = await supabase
            .from('v_unique_brands')
            .select('*');

        // Fetch unique ATC codes from view
        const { data: atcData } = await supabase
            .from('v_unique_atc')
            .select('*');

        // Fetch unique Concentrations from view
        const { data: concentrationsData } = await supabase
            .from('v_unique_concentrations')
            .select('*');

        // Fetch unique Presentations from view
        const { data: presentationsData } = await supabase
            .from('v_unique_presentations')
            .select('*');

        // Fetch location hierarchy
        const { data: locations } = await supabase
            .from('sucursales')
            .select('id, name, city, municipality')
            .order('city')
            .limit(1000);

        const uniqueLabs = labsData?.map(l => l.brand) || [];
        const uniqueATC = atcData?.map(a => a.atc_code) || [];
        const uniqueConcentrations = concentrationsData?.map(c => c.concentration) || [];
        const uniquePresentations = presentationsData?.map(p => p.presentation) || [];

        return NextResponse.json({
            success: true,
            data: {
                labs: uniqueLabs,
                atc: uniqueATC,
                concentrations: uniqueConcentrations,
                presentations: uniquePresentations,
                locations: locations || []
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
