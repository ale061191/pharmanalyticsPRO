import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Get the target product's ATC Code & basic info
        const { data: product, error } = await supabase
            .from('products')
            .select('id, name, atc_code, sales')
            .eq('id', id)
            .single();

        if (error || !product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        const atcCode = product.atc_code;

        // If no ATC, fallback to category or return empty (or handle specially)
        // User requested STRICT Therapeutic Group comparison.
        if (!atcCode || atcCode.length < 3) {
            return NextResponse.json({
                success: true,
                category: "Sin Clasificación ATC",
                rank: '-',
                marketShare: 0,
                competitors: []
            });
        }

        // 2. Define Therapeutic Group (Exact ATC Code match per user request - Level 5)
        const targetAtc = atcCode;

        // 3. Fetch PEER GROUP (products with EXACT same ATC code)
        const { data: peers } = await supabase
            .from('products')
            .select('id, name, clean_name, brand, image_url, atc_code, sales, is_pharma, active_ingredient')
            .eq('atc_code', targetAtc) // Strict Match
            .eq('is_pharma', true)
            .not('clean_name', 'is', null)
            .not('active_ingredient', 'is', null)
            .limit(200); // Increased limit to allow for consolidation

        if (!peers || peers.length === 0) {
            return NextResponse.json({ success: true, rank: 1, marketShare: 100, competitors: [] });
        }

        const peerIds = peers.map(p => p.id);

        // 4. Fetch SALES SNAPSHOTS for this group (ALL TIME / Max Available)
        const { data: snapshots } = await supabase
            .from('sales_snapshot')
            .select('product_id, sales_count, snapshot_date')
            .in('product_id', peerIds);

        // 5. Calculate Individual Volumes first
        const salesByProductId: Record<string, number> = {};
        peers.forEach(p => {
            salesByProductId[p.id] = (p as any).sales || 0;
        });

        if (snapshots) {
            snapshots.forEach((snap: any) => {
                const current = salesByProductId[snap.product_id] || 0;
                salesByProductId[snap.product_id] = Math.max(current, snap.sales_count);
            });
        }

        // 6. Deduplicate & Group by Clean Name
        const groupedPeersMap = new Map<string, any>();

        peers.forEach(p => {
            const key = p.clean_name; // Guaranteed not null by filter
            const volume = salesByProductId[p.id] || 0;

            if (!groupedPeersMap.has(key)) {
                groupedPeersMap.set(key, {
                    id: p.id,
                    name: p.name,
                    clean_name: p.clean_name,
                    brand: p.brand,
                    atc: p.atc_code,
                    image: p.image_url,
                    volume: volume,
                    ids: [p.id] // Track all IDs in this group
                });
            } else {
                const existing = groupedPeersMap.get(key);
                existing.volume += volume; // Sum volume
                existing.ids.push(p.id);

                // If this product is ME, ensure the group ID is mine so I can be identified
                if (String(p.id) === String(id)) {
                    existing.id = p.id;
                }
            }
        });

        // Convert back to array and Sort
        const rankedPeers = Array.from(groupedPeersMap.values())
            .sort((a, b) => b.volume - a.volume);

        // 7. Find My Rank
        // I am in the list either as a single item or the representative of a group
        const myRankIndex = rankedPeers.findIndex(p =>
            String(p.id) === String(id) || p.ids.includes(id) || p.ids.includes(Number(id))
        );
        const myRank = myRankIndex !== -1 ? myRankIndex + 1 : 0;

        // Find my volume (aggregated or individual)
        let myVolume = 0;
        if (myRankIndex !== -1) {
            myVolume = rankedPeers[myRankIndex].volume;
        } else {
            // Fallback if somehow filtered out (unlikely with clean_name logic unless null)
            myVolume = salesByProductId[id] || product.sales || 0;
        }

        // 8. Market Share
        const totalGroupVolume = rankedPeers.reduce((sum, p) => sum + p.volume, 0);
        const marketShare = totalGroupVolume > 0 ? (myVolume / totalGroupVolume) * 100 : 0;

        // 9. Get Paginated Competitors
        const { searchParams } = new URL(request.url); // Use request.url
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedCompetitors = rankedPeers
            .slice(startIndex, endIndex)
            .map(p => ({
                id: p.id,
                name: p.clean_name || p.name,
                brand: p.brand,
                sales: p.volume,
                rank: rankedPeers.indexOf(p) + 1,
                coverage: p.volume
            }));

        const hasMore = endIndex < rankedPeers.length;

        return NextResponse.json({
            success: true,
            category: `Código ATC: ${targetAtc}`,
            rank: myRank,
            marketShare: parseFloat(marketShare.toFixed(1)),
            totalCategoryProducts: rankedPeers.length, // Count of logic groups
            competitors: paginatedCompetitors,
            hasMore
        });

    } catch (error: any) {
        console.error('[CompetitorsAPI] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
