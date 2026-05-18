// CDN targets — used for scan overlay labels and probe ordering
// Actual probing is done server-side in /api/cdn-probes/probe/route.ts

export interface CdnTarget {
  name: string;
  url: string;
  color: string;
}

export const CDN_TARGETS: CdnTarget[] = [
  { name: 'Cloudflare',     url: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js', color: '#f6821f' },
  { name: 'Fastly',         url: 'https://cdnjs.fastly.net/ajax/libs/jquery/3.7.1/jquery.min.js',     color: '#ff282d' },
  { name: 'AWS CloudFront', url: 'https://d3aqoihi2n8ty8.cloudfront.net/actions/confetti/animated/1.gif', color: '#ff9900' },
  { name: 'Akamai',         url: 'https://www.akamai.com/favicon.ico',                                color: '#009bde' },
  { name: 'Bunny CDN',      url: 'https://fonts.bunny.net/css?family=inter:400',                      color: '#f5a623' },
  { name: 'jsDelivr',       url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',      color: '#e84d3d' },
  { name: 'Vercel Edge',    url: 'https://vercel.com/favicon.ico',                                    color: '#ffffff' },
  { name: 'Cloudinary',     url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',           color: '#3448c5' },
];
