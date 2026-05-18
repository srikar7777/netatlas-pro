export interface Measurement {
  id: string;
  lat: number;
  lng: number;
  reliability: number;
  latency: number;
  jitter: number;
  packet_loss: number;
  neighborhood: string;
  city: string;
  timestamp: number;
  cdn_probe?: CdnProbe;
  showRoutes?: boolean; // triggers arc visualization on map
}

export interface CdnResult {
  cdn: string;
  latency: number;
  edgeNode: string;
  edgeLat: number;
  edgeLng: number;
  edgeCity: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'timeout';
  ttfb: number;
  cached: boolean;
}

export interface CdnProbe {
  id: string;
  measurement_id?: string;
  lat: number;
  lng: number;
  neighborhood: string;
  city: string;
  timestamp: number;
  results: CdnResult[];
  bestCdn: string;
  worstCdn: string;
  avgLatency: number;
  deadZone: boolean;
}

export interface LocationInfo {
  neighborhood: string;
  city: string;
}

export interface Server {
  name: string;
  lat: number;
  lng: number;
}

export type PanelTab = 'connectivity' | 'cdn';
