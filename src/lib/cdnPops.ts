// Known CDN Points of Presence — mapped from airport PoP codes to coordinates
// These are the major US edge nodes that appear in response headers

export interface PopLocation {
  code: string;
  city: string;
  lat: number;
  lng: number;
}

// Cloudflare PoPs (from CF-Ray header suffix)
export const CLOUDFLARE_POPS: Record<string, PopLocation> = {
  IAD: { code: 'IAD', city: 'Ashburn, VA', lat: 38.9445, lng: -77.4558 },
  EWR: { code: 'EWR', city: 'Newark, NJ', lat: 40.6895, lng: -74.1745 },
  JFK: { code: 'JFK', city: 'New York, NY', lat: 40.6413, lng: -73.7781 },
  ORD: { code: 'ORD', city: 'Chicago, IL', lat: 41.9742, lng: -87.9073 },
  DFW: { code: 'DFW', city: 'Dallas, TX', lat: 32.8998, lng: -97.0403 },
  DAL: { code: 'DAL', city: 'Dallas, TX', lat: 32.8481, lng: -96.8512 },
  LAX: { code: 'LAX', city: 'Los Angeles, CA', lat: 33.9425, lng: -118.4081 },
  SJC: { code: 'SJC', city: 'San Jose, CA', lat: 37.3626, lng: -121.9290 },
  SEA: { code: 'SEA', city: 'Seattle, WA', lat: 47.4502, lng: -122.3088 },
  ATL: { code: 'ATL', city: 'Atlanta, GA', lat: 33.6407, lng: -84.4277 },
  MIA: { code: 'MIA', city: 'Miami, FL', lat: 25.7959, lng: -80.2870 },
  DEN: { code: 'DEN', city: 'Denver, CO', lat: 39.8561, lng: -104.6737 },
  PHX: { code: 'PHX', city: 'Phoenix, AZ', lat: 33.4373, lng: -112.0078 },
  MSP: { code: 'MSP', city: 'Minneapolis, MN', lat: 44.8848, lng: -93.2223 },
  BOS: { code: 'BOS', city: 'Boston, MA', lat: 42.3656, lng: -71.0096 },
  SFO: { code: 'SFO', city: 'San Francisco, CA', lat: 37.6213, lng: -122.3790 },
  PDX: { code: 'PDX', city: 'Portland, OR', lat: 45.5898, lng: -122.5951 },
  SLC: { code: 'SLC', city: 'Salt Lake City, UT', lat: 40.7884, lng: -111.9778 },
  CLT: { code: 'CLT', city: 'Charlotte, NC', lat: 35.2140, lng: -80.9431 },
  HOU: { code: 'HOU', city: 'Houston, TX', lat: 29.6454, lng: -95.2789 },
};

// Fastly PoPs (from x-served-by header)
export const FASTLY_POPS: Record<string, PopLocation> = {
  IAD: { code: 'IAD', city: 'Ashburn, VA', lat: 38.9445, lng: -77.4558 },
  JFK: { code: 'JFK', city: 'New York, NY', lat: 40.6413, lng: -73.7781 },
  ORD: { code: 'ORD', city: 'Chicago, IL', lat: 41.9742, lng: -87.9073 },
  DFW: { code: 'DFW', city: 'Dallas, TX', lat: 32.8998, lng: -97.0403 },
  LAX: { code: 'LAX', city: 'Los Angeles, CA', lat: 33.9425, lng: -118.4081 },
  SJC: { code: 'SJC', city: 'San Jose, CA', lat: 37.3626, lng: -121.9290 },
  SEA: { code: 'SEA', city: 'Seattle, WA', lat: 47.4502, lng: -122.3088 },
  ATL: { code: 'ATL', city: 'Atlanta, GA', lat: 33.6407, lng: -84.4277 },
  MIA: { code: 'MIA', city: 'Miami, FL', lat: 25.7959, lng: -80.2870 },
  DEN: { code: 'DEN', city: 'Denver, CO', lat: 39.8561, lng: -104.6737 },
};

// AWS CloudFront regions (approximate)
export const CLOUDFRONT_REGIONS: Record<string, PopLocation> = {
  'us-east-1': { code: 'IAD', city: 'N. Virginia', lat: 38.9445, lng: -77.4558 },
  'us-east-2': { code: 'CMH', city: 'Ohio', lat: 39.9612, lng: -82.9988 },
  'us-west-1': { code: 'SFO', city: 'N. California', lat: 37.6213, lng: -122.3790 },
  'us-west-2': { code: 'PDX', city: 'Oregon', lat: 45.5898, lng: -122.5951 },
};

// Vercel Edge regions
export const VERCEL_REGIONS: Record<string, PopLocation> = {
  iad1: { code: 'IAD', city: 'Washington DC', lat: 38.9445, lng: -77.4558 },
  sfo1: { code: 'SFO', city: 'San Francisco', lat: 37.6213, lng: -122.3790 },
  pdx1: { code: 'PDX', city: 'Portland', lat: 45.5898, lng: -122.5951 },
  sea1: { code: 'SEA', city: 'Seattle', lat: 47.4502, lng: -122.3088 },
  lax1: { code: 'LAX', city: 'Los Angeles', lat: 33.9425, lng: -118.4081 },
  dfw1: { code: 'DFW', city: 'Dallas', lat: 32.8998, lng: -97.0403 },
  ord1: { code: 'ORD', city: 'Chicago', lat: 41.9742, lng: -87.9073 },
  cle1: { code: 'CLE', city: 'Cleveland', lat: 41.4117, lng: -81.8498 },
  bos1: { code: 'BOS', city: 'Boston', lat: 42.3656, lng: -71.0096 },
  jfk1: { code: 'JFK', city: 'New York', lat: 40.6413, lng: -73.7781 },
};

// Default fallback locations per CDN (when we can't parse the edge node)
export const CDN_DEFAULT_LOCATIONS: Record<string, PopLocation> = {
  'Cloudflare':   { code: 'IAD', city: 'Ashburn, VA',      lat: 38.9445,  lng: -77.4558  },
  'Fastly':       { code: 'SJC', city: 'San Jose, CA',     lat: 37.3626,  lng: -121.9290 },
  'AWS CloudFront':{ code: 'IAD', city: 'N. Virginia',     lat: 38.9445,  lng: -77.4558  },
  'Akamai':       { code: 'EWR', city: 'Newark, NJ',       lat: 40.6895,  lng: -74.1745  },
  'Bunny CDN':    { code: 'ORD', city: 'Chicago, IL',      lat: 41.9742,  lng: -87.9073  },
  'jsDelivr':     { code: 'IAD', city: 'Ashburn, VA',      lat: 38.9445,  lng: -77.4558  },
  'Vercel Edge':  { code: 'IAD', city: 'Washington DC',    lat: 38.9445,  lng: -77.4558  },
  'Cloudinary':   { code: 'IAD', city: 'Ashburn, VA',      lat: 38.9445,  lng: -77.4558  },
};

export function resolveEdgeLocation(cdn: string, edgeNode: string): PopLocation {
  const code = edgeNode.replace(/^CF-/, '').replace(/^BNY-.*/, '').toUpperCase().slice(0, 3);

  if (cdn === 'Cloudflare' && CLOUDFLARE_POPS[code]) return CLOUDFLARE_POPS[code];
  if (cdn === 'Fastly' && FASTLY_POPS[code]) return FASTLY_POPS[code];
  if (cdn === 'Vercel Edge') {
    const regionKey = edgeNode.toLowerCase();
    for (const [key, loc] of Object.entries(VERCEL_REGIONS)) {
      if (regionKey.includes(key)) return loc;
    }
  }
  // Try generic airport code lookup across all known PoPs
  if (CLOUDFLARE_POPS[code]) return CLOUDFLARE_POPS[code];

  return CDN_DEFAULT_LOCATIONS[cdn] || { code: 'IAD', city: 'US East', lat: 38.9445, lng: -77.4558 };
}
