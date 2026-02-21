cat > src/app/page.tsx << 'EOF'
'use client';

import { useEffect, useState, useCallback } from 'react';
import Map from '@/components/Map';
import Header from '@/components/Header';
import SidePanel from '@/components/SidePanel';
import TestButton from '@/components/TestButton';
import ScanOverlay from '@/components/ScanOverlay';
import EmptyState from '@/components/EmptyState';

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

interface Server {
  name: string;
  lat: number;
  lng: number;
}

interface LocationInfo {
  neighborhood: string;
  city: string;
}

const SERVERS: Server[] = [
  { name: 'Virginia', lat: 37.4316, lng: -78.6569 },
  { name: 'Texas', lat: 31.9686, lng: -99.9018 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'California', lat: 36.7783, lng: -119.4179 },
];

export default function Home() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentServer, setCurrentServer] = useState<string>('');

  useEffect(() => {
    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMeasurements = async () => {
    try {
      const res = await fetch('/api/measurements');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMeasurements(data);
      }
    } catch (error) {
      console.error('Failed to fetch measurements:', error);
    }
  };

  const handleMarkerClick = useCallback((measurement: Measurement) => {
    setSelectedMeasurement(measurement);
  }, []);

  const handleClosePanel = () => {
    setSelectedMeasurement(null);
  };

  const runTest = async () => {
    if (isTestRunning) return;
    setIsTestRunning(true);

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const locationInfo = await reverseGeocode(latitude, longitude);
      const results = await simulateMeasurements();
      const aggregate = calculateAggregate(results);

      const measurement = {
        lat: latitude,
        lng: longitude,
        reliability: aggregate.reliability,
        latency: aggregate.latency,
        jitter: aggregate.jitter,
        packetLoss: aggregate.packetLoss,
        neighborhood: locationInfo.neighborhood,
        city: locationInfo.city,
        servers: results,
      };

      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement),
      });

      if (!res.ok) throw new Error('Failed to save');

      await fetchMeasurements();
      const saved = await res.json();
      setSelectedMeasurement(saved);

    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + (error as Error).message);
    } finally {
      setIsTestRunning(false);
      setCurrentServer('');
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
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
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<LocationInfo> => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await res.json();
      return {
        neighborhood: data.localityInfo?.informative?.[0]?.name || 
                     data.localityInfo?.informative?.[1]?.name ||
                     data.locality ||
                     'Unknown',
        city: data.city || data.locality || 'Unknown',
      };
    } catch (e) {
      return { neighborhood: 'Unknown', city: 'Unknown' };
    }
  };

  const simulateMeasurements = async () => {
    const results = [];
    for (const server of SERVERS) {
      await new Promise(r => setTimeout(r, 1000));
      setCurrentServer(server.name);
      
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
    reliability -= (avgPacketLoss * 20);
    reliability -= (avgJitter * 2);
    reliability -= (avgLatency * 0.1);
    
    return {
      reliability: Math.max(0, Math.min(100, Math.floor(reliability))),
      latency: Math.floor(avgLatency),
      jitter: Math.floor(avgJitter),
      packetLoss: parseFloat(avgPacketLoss.toFixed(2)),
    };
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-red-600">
      <div className="absolute inset-0 w-full h-full bg-blue-600">
        <Map measurements={measurements} onMarkerClick={handleMarkerClick} />
      </div>
      <div className="absolute top-4 left-4 z-50 text-white bg-black p-4 rounded">
        <div>Measurements: {measurements.length}</div>
        <div className="text-xs text-gray-400 mt-1">If you see this box, containers work</div>
      </div>
      <Header probeCount={measurements.length} />
      <EmptyState isVisible={measurements.length === 0} />
      <TestButton onClick={runTest} isRunning={isTestRunning} />
      <ScanOverlay isActive={isTestRunning} currentServer={currentServer} />
      <SidePanel measurement={selectedMeasurement} onClose={handleClosePanel} />
    </main>
  );
}
EOF