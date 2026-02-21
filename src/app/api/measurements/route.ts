import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .gt('timestamp', cutoff)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.lat || !data.lng || !data.reliability) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const measurement = {
      lat: data.lat,
      lng: data.lng,
      reliability: data.reliability,
      latency: data.latency,
      jitter: data.jitter,
      packet_loss: data.packetLoss,
      neighborhood: data.neighborhood,
      city: data.city,
      timestamp: Date.now(),
    };

    const { data: inserted, error } = await supabase
      .from('measurements')
      .insert(measurement)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Error saving:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
