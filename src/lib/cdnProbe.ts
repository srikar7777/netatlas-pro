import { CdnResult } from '@/types';

export interface CdnTarget {
  name: string;
  url: string;
  color: string;
  headerKeys: string[];
}

export const CDN_TARGETS: CdnTarget[] = [
  {
    name: 'Cloudflare',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
    color: '#f6821f',
    headerKeys: ['cf-ray', 'cf-cache-status'],
  },
  {
    name: 'Fastly',
    url: 'https://cdnjs.fastly.net/ajax/libs/jquery/3.7.1/jquery.min.js',
    color: '#ff282d',
    headerKeys: ['x-served-by', 'x-cache'],
  },
  {
    name: 'AWS CloudFront',
    url: 'https://d3aqoihi2n8ty8.cloudfront.net/actions/confetti/animated/1.gif',
    color: '#ff9900',
    headerKeys: ['x-amz-cf-id', 'x-cache'],
  },
  {
    name: 'Akamai',
    url: 'https://www.akamai.com/favicon.ico',
    color: '#009bde',
    headerKeys: ['x-check-cacheable', 'x-serial'],
  },
  {
    name: 'Bunny CDN',
    url: 'https://fonts.bunny.net/css?family=inter:400',
    color: '#f5a623',
    headerKeys: ['bunny-request-id', 'cdn-requestid'],
  },
  {
    name: 'jsDelivr',
    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
    color: '#e84d3d',
    headerKeys: ['x-served-by', 'x-cache'],
  },
  {
    name: 'Vercel Edge',
    url: 'https://vercel.com/favicon.ico',
    color: '#ffffff',
    headerKeys: ['x-vercel-id', 'x-vercel-cache'],
  },
  {
    name: 'Cloudinary',
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    color: '#3448c5',
    headerKeys: ['x-cdn', 'cf-ray'],
  },
];

export async function probeCdn(target: CdnTarget): Promise<CdnResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${target.url}?_=${Date.now()}`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);
    const latency = Math.round(performance.now() - start);

    // Extract edge node from response headers
    let edgeNode = 'Unknown';
    const cfRay = res.headers.get('cf-ray');
    const xServedBy = res.headers.get('x-served-by');
    const xAmzCfId = res.headers.get('x-amz-cf-id');
    const xVercelId = res.headers.get('x-vercel-id');
    const bunnyId = res.headers.get('bunny-request-id') || res.headers.get('cdn-requestid');

    if (cfRay) {
      // CF-Ray format: "abc123-IAD" — last part is PoP code
      const pop = cfRay.split('-').pop();
      edgeNode = pop ? `CF-${pop}` : 'Cloudflare';
    } else if (xServedBy) {
      // Fastly/jsDelivr: "cache-iad2345-IAD"
      const parts = xServedBy.split('-');
      edgeNode = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : xServedBy.slice(0, 12);
    } else if (xAmzCfId) {
      edgeNode = `CF-${xAmzCfId.slice(0, 8)}`;
    } else if (xVercelId) {
      const pop = xVercelId.split('::')[0];
      edgeNode = pop ? pop.toUpperCase() : 'Vercel';
    } else if (bunnyId) {
      edgeNode = `BNY-${bunnyId.slice(0, 6)}`;
    }

    const cacheHeader =
      res.headers.get('cf-cache-status') ||
      res.headers.get('x-cache') ||
      res.headers.get('x-vercel-cache') ||
      '';
    const cached = /hit/i.test(cacheHeader);

    const status: CdnResult['status'] =
      latency < 40 ? 'excellent' :
      latency < 80 ? 'good' :
      latency < 150 ? 'fair' : 'poor';

    return {
      cdn: target.name,
      latency,
      edgeNode,
      status,
      ttfb: latency,
      cached,
    };
  } catch {
    clearTimeout(timeout);
    return {
      cdn: target.name,
      latency: 9999,
      edgeNode: 'Timeout',
      status: 'timeout',
      ttfb: 9999,
      cached: false,
    };
  }
}
