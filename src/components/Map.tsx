'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Measurement, CdnResult } from '@/types';

interface MapProps {
  measurements: Measurement[];
  onMarkerClick: (m: Measurement) => void;
  focusMeasurement?: Measurement | null;
  panelOpen?: boolean;
}

function generateArc(
  fromLng: number, fromLat: number,
  toLng: number, toLat: number,
  steps = 80
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = fromLng + (toLng - fromLng) * t;
    const lat = fromLat + (toLat - fromLat) * t;
    const lift = Math.sin(Math.PI * t) * Math.abs(toLng - fromLng) * 0.16;
    pts.push([lng, lat + lift]);
  }
  return pts;
}

function latencyToOpacity(ms: number) {
  if (ms >= 9999) return 0;
  if (ms < 40)  return 0.80;
  if (ms < 80)  return 0.58;
  if (ms < 150) return 0.38;
  return 0.22;
}

function latencyToWidth(ms: number) {
  if (ms >= 9999) return 0.4;
  if (ms < 40)  return 2.4;
  if (ms < 80)  return 1.7;
  if (ms < 150) return 1.1;
  return 0.7;
}

const ARC_COLORS: Record<string, string> = {
  'Cloudflare':     '#d0d0d0',
  'Fastly':         '#a8a8a8',
  'AWS CloudFront': '#c0c0c0',
  'Akamai':         '#989898',
  'Bunny CDN':      '#d8d8d8',
  'jsDelivr':       '#909090',
  'Vercel Edge':    '#e8e8e8',
  'Cloudinary':     '#808080',
};

export default function Map({
  measurements,
  onMarkerClick,
  focusMeasurement = null,
  panelOpen = false,
}: MapProps) {
  const mapContainer  = useRef<HTMLDivElement>(null);
  const map           = useRef<maplibregl.Map | null>(null);
  const markers       = useRef<maplibregl.Marker[]>([]);
  const edgeMarkers   = useRef<maplibregl.Marker[]>([]);
  const arcLayerIds   = useRef<string[]>([]);
  const animFrames    = useRef<number[]>([]);
  const lastFocusId   = useRef<string | null>(null);
  const lastShowRoutes = useRef<boolean>(false);

  // ── Init map ──────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
      },
      center: [-98.5795, 39.8283],
      zoom: 3.5,
    });

    map.current.on('load', () => map.current?.resize());
    const onResize = () => map.current?.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      animFrames.current.forEach(cancelAnimationFrame);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Clear arcs ────────────────────────────────────
  const clearArcs = () => {
    animFrames.current.forEach(cancelAnimationFrame);
    animFrames.current = [];
    if (map.current) {
      // Remove layers first
      arcLayerIds.current.forEach((id) => {
        try { if (map.current!.getLayer(id))  map.current!.removeLayer(id);  } catch {}
      });
      // Then sources
      arcLayerIds.current.forEach((id) => {
        try { if (map.current!.getSource(id)) map.current!.removeSource(id); } catch {}
      });
    }
    arcLayerIds.current = [];
    edgeMarkers.current.forEach((m) => m.remove());
    edgeMarkers.current = [];
  };

  // ── Draw arcs ─────────────────────────────────────
  const drawArcs = (focusM: Measurement) => {
    if (!map.current || !focusM.cdn_probe) return;

    const probe   = focusM.cdn_probe;
    const userLng = focusM.lng;
    const userLat = focusM.lat;

    probe.results.forEach((result: CdnResult, i: number) => {
      if (result.status === 'timeout' || !result.edgeLng || !result.edgeLat) return;

      const color   = ARC_COLORS[result.cdn] || '#909090';
      const opacity = latencyToOpacity(result.latency);
      const width   = latencyToWidth(result.latency);
      const arcPts  = generateArc(userLng, userLat, result.edgeLng, result.edgeLat);

      const srcId   = `arc-src-${i}`;
      const glowId  = `arc-glow-${i}`;
      const lineId  = `arc-line-${i}`;

      try {
        map.current!.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arcPts } },
        });

        map.current!.addLayer({
          id: glowId, type: 'line', source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': width * 4, 'line-opacity': 0, 'line-blur': 6 },
        });

        map.current!.addLayer({
          id: lineId, type: 'line', source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0 },
        });

        // layers before source in cleanup list
        arcLayerIds.current.push(glowId, lineId, srcId);

        // Animate fade-in
        const delay    = i * 150;
        const duration = 1000;
        const t0       = performance.now() + delay;

        const tick = (now: number) => {
          if (!map.current?.getLayer(lineId)) return;
          const p = Math.min(Math.max((now - t0) / duration, 0), 1);
          const e = 1 - Math.pow(1 - p, 3);
          map.current.setPaintProperty(lineId, 'line-opacity', e * opacity);
          map.current.setPaintProperty(glowId, 'line-opacity', e * opacity * 0.18);
          if (p < 1) animFrames.current.push(requestAnimationFrame(tick));
        };
        animFrames.current.push(requestAnimationFrame(tick));

      } catch (err) {
        console.warn('Arc draw error:', err);
      }

      // Edge node label marker
      const edgeDelay = i * 150;
      const el = document.createElement('div');
      el.className = 'edge-node-marker';
      el.style.animationDelay = `${edgeDelay + 500}ms`;

      const dot = document.createElement('div');
      dot.className = 'edge-node-dot';
      dot.style.background = color;
      dot.style.boxShadow  = `0 0 10px ${color}50`;

      const lbl = document.createElement('div');
      lbl.className = 'edge-node-label';
      lbl.innerHTML = `
        <span class="edge-node-cdn">${result.cdn.split(' ')[0].toUpperCase()}</span>
        <span class="edge-node-code">${result.edgeNode !== 'Unknown' ? result.edgeNode : result.edgeCity}</span>
        <span class="edge-node-latency">${result.latency}ms</span>
      `;

      el.appendChild(dot);
      el.appendChild(lbl);

      const em = new maplibregl.Marker({ element: el, anchor: 'left' })
        .setLngLat([result.edgeLng, result.edgeLat])
        .addTo(map.current!);
      edgeMarkers.current.push(em);
    });
  };

  // ── React to focusMeasurement + showRoutes changes ─
  useEffect(() => {
    if (!map.current) return;

    const id         = focusMeasurement?.id ?? null;
    const showRoutes = focusMeasurement?.showRoutes ?? false;
    const idChanged  = id !== lastFocusId.current;
    const routesChanged = showRoutes !== lastShowRoutes.current;

    lastFocusId.current    = id;
    lastShowRoutes.current = showRoutes;

    // Always clear arcs first
    clearArcs();

    if (!focusMeasurement) return;

    // If routes turned off, fly back to probe location
    if (!showRoutes && routesChanged && focusMeasurement) {
      map.current.flyTo({
        center: [focusMeasurement.lng, focusMeasurement.lat],
        zoom: 11,
        speed: 1.0,
        curve: 1.5,
        essential: true,
        padding: panelOpen
          ? { top: 80, right: 460, bottom: 80, left: 80 }
          : { top: 80, right: 80, bottom: 80, left: 80 },
      });
      return;
    }

    // Camera fly — always fly when id changes OR routes toggle
    if (idChanged || routesChanged) {
      if (showRoutes && focusMeasurement.cdn_probe) {
        // Cinematic sequence: zoom into probe first, then pull back to show all routes
        map.current.flyTo({
          center: [focusMeasurement.lng, focusMeasurement.lat],
          zoom: 9,
          speed: 1.4,
          curve: 1.5,
          essential: true,
        });

        // After zooming in, pull back to full US view to reveal arcs
        setTimeout(() => {
          if (!map.current) return;
          map.current.flyTo({
            center: [-95, 38],
            zoom: 3.6,
            speed: 0.6,
            curve: 1.8,
            essential: true,
            padding: panelOpen
              ? { top: 60, right: 460, bottom: 60, left: 60 }
              : { top: 60, right: 60, bottom: 60, left: 60 },
          });
        }, 1800);

      } else if (idChanged) {
        map.current.flyTo({
          center: [focusMeasurement.lng, focusMeasurement.lat],
          zoom: 11,
          speed: 1.2,
          curve: 1.42,
          essential: true,
          padding: panelOpen
            ? { top: 80, right: 460, bottom: 80, left: 80 }
            : { top: 80, right: 80, bottom: 80, left: 80 },
        });
      }
    }

    // Draw arcs if routes are on
    if (showRoutes && focusMeasurement.cdn_probe) {
      const go = () => drawArcs(focusMeasurement);
      if (map.current.isStyleLoaded()) {
        // Wait for zoom-in + pullback to complete before drawing arcs
        setTimeout(go, 2200);
      } else {
        map.current.once('load', () => setTimeout(go, 2200));
      }
    }
  }, [focusMeasurement?.id, focusMeasurement?.showRoutes, panelOpen]);

  // ── Measurement markers ───────────────────────────
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    measurements.forEach((data) => {
      const el = document.createElement('div');
      el.className = 'marker-container';

      const pulse = document.createElement('div');
      pulse.className = 'marker-pulse-ring';
      if      (data.reliability >= 90) pulse.classList.add('marker-excellent');
      else if (data.reliability >= 75) pulse.classList.add('marker-good');
      else if (data.reliability >= 60) pulse.classList.add('marker-fair');
      else                              pulse.classList.add('marker-poor');

      const pin = document.createElement('div');
      pin.className = 'marker-pin';
      if      (data.reliability >= 90) pin.classList.add('marker-excellent');
      else if (data.reliability >= 75) pin.classList.add('marker-good');
      else if (data.reliability >= 60) pin.classList.add('marker-fair');
      else                              pin.classList.add('marker-poor');

      el.appendChild(pulse);
      el.appendChild(pin);

      if (data.cdn_probe) {
        const badge = document.createElement('div');
        badge.className = 'marker-cdn-badge';
        badge.textContent = 'CDN';
        el.appendChild(badge);
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([data.lng, data.lat])
        .addTo(map.current!);

      el.addEventListener('click', (e) => { e.stopPropagation(); onMarkerClick(data); });
      markers.current.push(marker);
    });
  }, [measurements, onMarkerClick]);

  return <div ref={mapContainer} className="map-root" />;
}
