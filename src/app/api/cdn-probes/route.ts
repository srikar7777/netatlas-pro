import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;

    const { data, error } = await supabase
      .from('cdn_probes')
      .select('*')
      .gt('timestamp', cutoff)
      .order('timestamp', { ascending: false })
      .limit(200);

    if (error) throw error;

    // Normalize snake_case → camelCase for frontend
    const normalized = (data || []).map((p: any) => ({
      ...p,
      results: typeof p.results === 'string' ? JSON.parse(p.results) : p.results,
      bestCdn: p.best_cdn,
      worstCdn: p.worst_cdn,
      avgLatency: p.avg_latency,
      deadZone: p.dead_zone,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching cdn probes:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      lat,
      lng,
      neighborhood,
      city,
      results,
      bestCdn,
      worstCdn,
      avgLatency,
      deadZone,
      measurementId,
    } = body;

    if (!lat || !lng || !results) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const probe = {
      lat,
      lng,
      neighborhood: neighborhood || 'Unknown',
      city: city || 'Unknown',
      timestamp: Date.now(),
      results: JSON.stringify(results),
      best_cdn: bestCdn,
      worst_cdn: worstCdn,
      avg_latency: avgLatency,
      dead_zone: deadZone,
      measurement_id: measurementId || null,
    };

    const { data: inserted, error } = await supabase
      .from('cdn_probes')
      .insert(probe)
      .select()
      .single();

    if (error) throw error;

    // Normalize response to camelCase
    const parsed = {
      ...inserted,
      results: typeof inserted.results === 'string'
        ? JSON.parse(inserted.results)
        : inserted.results,
      bestCdn: inserted.best_cdn,
      worstCdn: inserted.worst_cdn,
      avgLatency: inserted.avg_latency,
      deadZone: inserted.dead_zone,
    };

    return NextResponse.json(parsed, { status: 201 });
  } catch (error) {
    console.error('Error saving cdn probe:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
