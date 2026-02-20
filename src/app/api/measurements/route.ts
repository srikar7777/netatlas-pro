import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);
    const snapshot = await db
      .collection('measurements')
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const measurements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(measurements);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.lat || !data.lng || !data.reliability) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const measurement = { ...data, timestamp: Date.now() };
    const docRef = await db.collection('measurements').add(measurement);
    
    return NextResponse.json({ id: docRef.id, ...measurement }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
