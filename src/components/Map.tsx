'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface Measurement {
  id: string;
  lat: number;
  lng: number;
  reliability: number;
  latency: number;
  jitter: number;
  packetLoss: number;
  neighborhood: string;
  city: string;
  timestamp: number;
}

interface MapProps {
  measurements: Measurement[];
  onMarkerClick: (m: Measurement) => void;
  focusMeasurement?: Measurement | null;
  panelOpen?: boolean;
}

export default function Map({
  measurements,
  onMarkerClick,
  focusMeasurement = null,
  panelOpen = false,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const lastFocusedId = useRef<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

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
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [-98.5795, 39.8283],
      zoom: 3.5,
    });

    map.current.on('load', () => {
      map.current?.resize();
    });

    const handleResize = () => map.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 🚀 GOOGLE MAPS STYLE CAMERA ZOOM
  useEffect(() => {
    if (!map.current) return;
    if (!focusMeasurement) return;

    if (lastFocusedId.current === focusMeasurement.id) return;
    lastFocusedId.current = focusMeasurement.id;

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
  }, [focusMeasurement, panelOpen]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    measurements.forEach((data) => {
      const el = document.createElement('div');
      el.className = 'marker-container';

      const pin = document.createElement('div');
      pin.className = 'marker-pin';
      if (data.reliability >= 90) pin.classList.add('marker-excellent');
      else if (data.reliability >= 75) pin.classList.add('marker-good');
      else if (data.reliability >= 60) pin.classList.add('marker-fair');
      else pin.classList.add('marker-poor');

      const pulse = document.createElement('div');
      pulse.className = 'marker-pulse-ring';
      if (data.reliability >= 90) pulse.classList.add('marker-excellent');
      else if (data.reliability >= 75) pulse.classList.add('marker-good');
      else if (data.reliability >= 60) pulse.classList.add('marker-fair');
      else pulse.classList.add('marker-poor');

      el.appendChild(pulse);
      el.appendChild(pin);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([data.lng, data.lat])
        .addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick(data);
      });

      markers.current.push(marker);
    });
  }, [measurements, onMarkerClick]);

  return <div ref={mapContainer} className="map-root" />;
}
