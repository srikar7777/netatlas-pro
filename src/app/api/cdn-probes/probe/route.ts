import { NextResponse } from 'next/server';
import { resolveEdgeLocation } from '@/lib/cdnPops';

export const dynamic = 'force-dynamic';

// Only CDNs that block CORS — must be probed server-side
const SERVER_ONLY_TARGETS = [
  { name: 'Fastly',         url: 'https://cdnjs.fastly.net/ajax/libs/jquery/3.7.1/jquery.min.js' },
  { name: 'AWS CloudFront', url: 'https://d3aqoihi2n8ty8.cloudfront.net/actions/confetti/animated/1.gif' },
  { name: 'Akamai',         url: 'https://www.akamai.com/favicon.ico' },
];

async function probeCdn(target: { name: string; url: string }) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${target.url}?_=${Date.now()}`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;

    let edgeNode = 'Unknown';
    const cfRay     = res.headers.get('cf-ray');
    const xServedBy = res.headers.get('x-served-by');
    const xVercelId = res.headers.get('x-vercel-id');
    const bunnyId   = res.headers.get('bunny-request-id') || res.headers.get('cdn-requestid');

    if (cfRay) {
      const pop = cfRay.split('-').pop();
      edgeNode = pop ? `CF-${pop}` : 'Cloudflare';
    } else if (xServedBy) {
      const parts = xServedBy.split(',')[0].trim().split('-');
      edgeNode = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : xServedBy.slice(0, 12);
    } else if (xVercelId) {
      const pop = xVercelId.split('::')[0];
      edgeNode = pop ? pop.toUpperCase() : 'Vercel';
    } else if (bunnyId) {
      edgeNode = `BNY-${bunnyId.slice(0, 6)}`;
    }

    const cacheHeader =
      res.headers.get('cf-cache-status') ||
      res.headers.get('x-cache') ||
      res.headers.get('x-vercel-cache') || '';
    const cached = /hit/i.test(cacheHeader);
    const status = latency < 40 ? 'excellent' : latency < 80 ? 'good' : latency < 150 ? 'fair' : 'poor';
    const location = resolveEdgeLocation(target.name, edgeNode);

    return { cdn: target.name, latency, edgeNode, edgeLat: location.lat, edgeLng: location.lng, edgeCity: location.city, status, ttfb: latency, cached, source: 'server' as const };
  } catch {
    clearTimeout(timeout);
    const fallback = resolveEdgeLocation(target.name, '');
    return { cdn: target.name, latency: 9999, edgeNode: 'Timeout', edgeLat: fallback.lat, edgeLng: fallback.lng, edgeCity: fallback.city, status: 'timeout' as const, ttfb: 9999, cached: false, source: 'server' as const };
  }
}

export async function GET() {
  const results = await Promise.all(SERVER_ONLY_TARGETS.map(probeCdn));
  return NextResponse.json(results);
}
