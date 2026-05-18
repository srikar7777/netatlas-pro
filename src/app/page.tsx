'use client';

import { useEffect, useState, useCallback } from 'react';
import Map from '@/components/Map';
import Header from '@/components/Header';
import SidePanel from '@/components/SidePanel';
import TestButton from '@/components/TestButton';
import ScanOverlay from '@/components/ScanOverlay';
import EmptyState from '@/components/EmptyState';
import { Measurement, CdnProbe, LocationInfo } from '@/types';
import { CDN_TARGETS } from '@/lib/cdnProbe';
import { runBrowserProbes, BROWSER_CDN_NAMES } from '@/lib/browserProbe';

const SERVERS = [
  { name: 'Virginia', lat: 37.4316, lng: -78.6569 },
  { name: 'Texas', lat: 31.9686, lng: -99.9018 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'California', lat: 36.7783, lng: -119.4179 },
];

export default function Home() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [scanPhase, setScanPhase] = useState<'idle' | 'locating' | 'connectivity' | 'cdn'>('idle');
  const [currentServer, setCurrentServer] = useState('');
  const [currentCdn, setCurrentCdn] = useState('');
  const [cdnProgress, setCdnProgress] = useState(0);

  useEffect(() => {
    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMeasurements = async () => {
    try {
      // Fetch measurements and cdn probes together, then join them
      const [mRes, cRes] = await Promise.all([
        fetch('/api/measurements'),
        fetch('/api/cdn-probes'),
      ]);
      const mData = await mRes.json();
      const cData = await cRes.json();

      if (Array.isArray(mData) && Array.isArray(cData)) {
        const parsedCdn = cData.map((p: any) => ({
          ...p,
          results: typeof p.results === 'string' ? JSON.parse(p.results) : p.results,
          // Map snake_case from Supabase to camelCase
          bestCdn: p.best_cdn,
          worstCdn: p.worst_cdn,
          avgLatency: p.avg_latency,
          deadZone: p.dead_zone,
          measurement_id: p.measurement_id,
        }));
        const enriched = mData.map((m: Measurement) => ({
          ...m,
          cdn_probe: parsedCdn.find((c: CdnProbe) => c.measurement_id === m.id) || undefined,
        }));
        setMeasurements(enriched);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  };

  const handleMarkerClick = useCallback((measurement: Measurement) => {
    // Auto-show routes if this pin has CDN data
    setShowRoutes(!!(measurement.cdn_probe));
    setSelectedMeasurement(measurement);
  }, []);

  const handleClosePanel = () => {
    setShowRoutes(false);
    setSelectedMeasurement(null);
  };

  const handleToggleRoutes = () => {
    setShowRoutes((prev) => !prev);
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

  const reverseGeocode = async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await res.json();
      return {
        neighborhood:
          data.localityInfo?.informative?.[0]?.name ||
          data.localityInfo?.informative?.[1]?.name ||
          data.locality ||
          'Unknown',
        city: data.city || data.locality || 'Unknown',
      };
    } catch {
      return { neighborhood: 'Unknown', city: 'Unknown' };
    }
  };

  const simulateConnectivity = async () => {
    const results = [];
    for (const server of SERVERS) {
      setCurrentServer(server.name);
      await new Promise((r) => setTimeout(r, 800));
      const baseLatency = Math.random() * 30 + 10;
      const jitter = Math.random() * 10 + 1;
      const packetLoss = Math.random() > 0.9 ? Math.random() * 2 : 0;
      results.push({
        server: server.name,
        latency: Math.floor(baseLatency),
        jitter: Math.floor(jitter),
        packetLoss: parseFloat(packetLoss.toFixed(2)),
      });
    }
    return results;
  };

  const calculateAggregate = (results: any[]) => {
    const avgLatency = results.reduce((a, b) => a + b.latency, 0) / results.length;
    const avgJitter = results.reduce((a, b) => a + b.jitter, 0) / results.length;
    const avgPacketLoss = results.reduce((a, b) => a + b.packetLoss, 0) / results.length;
    let reliability = 100;
    reliability -= avgPacketLoss * 20;
    reliability -= avgJitter * 2;
    reliability -= avgLatency * 0.1;
    return {
      reliability: Math.max(0, Math.min(100, Math.floor(reliability))),
      latency: Math.floor(avgLatency),
      jitter: Math.floor(avgJitter),
      packetLoss: parseFloat(avgPacketLoss.toFixed(2)),
    };
  };

  const runTest = async () => {
    if (isTestRunning) return;
    setIsTestRunning(true);
    setScanPhase('locating');

    try {
      // Phase 1: Get location
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const locationInfo = await reverseGeocode(latitude, longitude);

      // Phase 2: Connectivity test
      setScanPhase('connectivity');
      const connResults = await simulateConnectivity();
      const aggregate = calculateAggregate(connResults);

      const measurement = {
        lat: latitude,
        lng: longitude,
        reliability: aggregate.reliability,
        latency: aggregate.latency,
        jitter: aggregate.jitter,
        packetLoss: aggregate.packetLoss,
        neighborhood: locationInfo.neighborhood,
        city: locationInfo.city,
        servers: connResults,
      };

      const connRes = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement),
      });
      if (!connRes.ok) {
        const errBody = await connRes.text();
        throw new Error(`Connectivity save failed (${connRes.status}): ${errBody}`);
      }
      const savedMeasurement: Measurement = await connRes.json();

      // Phase 3: CDN probes — browser-side (accurate) + server-side (CORS-blocked CDNs)
      setScanPhase('cdn');
      setCurrentCdn('Initializing...');
      setCdnProgress(10);

      // Run browser probes (from user's actual location) and server probes in parallel
      const [browserResults, serverRes] = await Promise.all([
        runBrowserProbes(),
        fetch('/api/cdn-probes/probe'),
      ]);

      if (!serverRes.ok) {
        const errBody = await serverRes.text();
        throw new Error(`CDN probe failed (${serverRes.status}): ${errBody}`);
      }
      const serverResults = await serverRes.json();

      // Merge: browser results first (more accurate), then server-only CDNs
      const cdnResults: import('@/types').CdnResult[] = [
        ...browserResults,
        ...serverResults,
      ];

      // Animate through CDN names for the overlay
      for (let i = 0; i < CDN_TARGETS.length; i++) {
        setCurrentCdn(CDN_TARGETS[i].name);
        setCdnProgress(Math.round(((i + 1) / CDN_TARGETS.length) * 100));
        await new Promise((r) => setTimeout(r, 200));
      }
      setCdnProgress(100);

      const validResults = cdnResults.filter((r) => r.status !== 'timeout');
      const bestCdn = validResults.length
        ? validResults.reduce((a, b) => (a.latency < b.latency ? a : b)).cdn
        : 'None';
      const worstCdn = validResults.length
        ? validResults.reduce((a, b) => (a.latency > b.latency ? a : b)).cdn
        : 'None';
      const avgLatency = validResults.length
        ? Math.round(validResults.reduce((a, b) => a + b.latency, 0) / validResults.length)
        : 9999;
      const deadZone = validResults.every((r) => r.latency > 200);

      const cdnPayload = {
        lat: latitude,
        lng: longitude,
        neighborhood: locationInfo.neighborhood,
        city: locationInfo.city,
        results: cdnResults,
        bestCdn,
        worstCdn,
        avgLatency,
        deadZone,
        measurementId: savedMeasurement.id,
      };

      const cdnRes = await fetch('/api/cdn-probes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cdnPayload),
      });
      if (!cdnRes.ok) {
        const errBody = await cdnRes.text();
        throw new Error(`CDN save failed (${cdnRes.status}): ${errBody}`);
      }
      const savedCdnProbe: CdnProbe = await cdnRes.json();

      await fetchMeasurements();
      // Show enriched measurement with routes visible
      setShowRoutes(true);
      setSelectedMeasurement({ ...savedMeasurement, cdn_probe: savedCdnProbe, showRoutes: true });
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setIsTestRunning(false);
      setScanPhase('idle');
      setCurrentServer('');
      setCurrentCdn('');
      setCdnProgress(0);
    }
  };

  const panelOpen = !!selectedMeasurement;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 z-0">
        <Map
          measurements={measurements}
          onMarkerClick={handleMarkerClick}
          focusMeasurement={selectedMeasurement ? { ...selectedMeasurement, showRoutes } : null}
          panelOpen={panelOpen}
        />
      </div>

      <div className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Header
            probeCount={measurements.length}
            cdnProbeCount={measurements.filter(m => m.cdn_probe).length}
          />
        </div>

        <EmptyState isVisible={measurements.length === 0} />

        <div className="pointer-events-auto">
          <TestButton onClick={runTest} isRunning={isTestRunning} />
        </div>

        {/* Route legend — only shown when routes are visible */}
        {showRoutes && selectedMeasurement?.cdn_probe && (
          <div className="route-legend">
            <div className="route-legend-item">
              <span className="route-legend-line browser" />
              <span>From your location</span>
            </div>
            <div className="route-legend-item">
              <span className="route-legend-line server" />
              <span>From Vercel server</span>
            </div>
          </div>
        )}

        <ScanOverlay
          isActive={isTestRunning}
          phase={scanPhase}
          currentServer={currentServer}
          currentCdn={currentCdn}
          cdnProgress={cdnProgress}
          cdnTargets={CDN_TARGETS.map((t) => t.name)}
        />

        <SidePanel
          measurement={selectedMeasurement}
          showRoutes={showRoutes}
          onToggleRoutes={handleToggleRoutes}
          onClose={handleClosePanel}
        />
      </div>
    </main>
  );
}
