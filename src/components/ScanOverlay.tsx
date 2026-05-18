'use client';

import { useEffect, useState } from 'react';
import { CDN_TARGETS } from '@/lib/cdnProbe';

interface ScanOverlayProps {
  isActive: boolean;
  phase: 'idle' | 'locating' | 'connectivity' | 'cdn';
  currentServer?: string;
  currentCdn?: string;
  cdnProgress?: number;
  cdnTargets?: string[];
}

export default function ScanOverlay({
  isActive,
  phase,
  currentServer,
  currentCdn,
  cdnProgress = 0,
  cdnTargets = [],
}: ScanOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [completedCdns, setCompletedCdns] = useState<string[]>([]);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        setMounted(false);
        setCompletedCdns([]);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  // Track completed CDNs
  useEffect(() => {
    if (!currentCdn) return;
    const idx = cdnTargets.indexOf(currentCdn);
    if (idx > 0) {
      setCompletedCdns(cdnTargets.slice(0, idx));
    }
  }, [currentCdn, cdnTargets]);

  if (!mounted) return null;

  const phaseLabel = {
    idle: '',
    locating: 'ACQUIRING LOCATION...',
    connectivity: currentServer ? `TESTING ${currentServer.toUpperCase()}` : 'MEASURING CONNECTIVITY...',
    cdn: currentCdn ? `PROBING ${currentCdn.toUpperCase()}` : 'INITIALIZING CDN PROBES...',
  }[phase];

  const phaseSubLabel = {
    idle: '',
    locating: 'GPS + Reverse Geocode',
    connectivity: 'Virginia • Texas • Chicago • California',
    cdn: `${Math.round(cdnProgress)}% complete — ${cdnTargets.length} CDN providers`,
  }[phase];

  const phaseStep = {
    idle: 0,
    locating: 1,
    connectivity: 2,
    cdn: 3,
  }[phase];

  return (
    <div className={`scan-overlay ${visible ? 'active' : ''}`}>
      {/* Background grid */}
      <div className="scan-grid" />

      {/* Radar */}
      <div className="radar-container">
        {/* Concentric rings */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="radar-ring"
            style={{
              width: `${i * 25}%`,
              height: `${i * 25}%`,
              opacity: 0.15 + (4 - i) * 0.05,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}

        {/* Sweep beam */}
        <div className={`radar-sweep-beam ${phase === 'cdn' ? 'sweep-fast' : ''}`} />

        {/* Center dot */}
        <div className="radar-center" />

        {/* Phase indicator ring */}
        <div
          className="radar-progress-ring"
          style={{
            '--progress': `${phase === 'cdn' ? cdnProgress : phase === 'connectivity' ? 50 : phase === 'locating' ? 20 : 0}%`,
          } as React.CSSProperties}
        />
      </div>

      {/* Phase steps */}
      <div className="scan-steps">
        {[
          { label: 'LOCATE', step: 1 },
          { label: 'CONNECTIVITY', step: 2 },
          { label: 'CDN PROBE', step: 3 },
        ].map(({ label, step }) => (
          <div
            key={step}
            className={`scan-step ${phaseStep > step ? 'done' : phaseStep === step ? 'active' : 'pending'}`}
          >
            <div className="scan-step-dot">
              {phaseStep > step ? '✓' : step}
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Main label */}
      <div className="scan-text">{phaseLabel}</div>
      <div className="scan-servers">{phaseSubLabel}</div>

      {/* CDN progress grid */}
      {phase === 'cdn' && cdnTargets.length > 0 && (
        <div className="cdn-probe-grid">
          {CDN_TARGETS.map((target) => {
            const isDone = completedCdns.includes(target.name);
            const isActive = target.name === currentCdn;
            return (
              <div
                key={target.name}
                className={`cdn-probe-item ${isDone ? 'done' : isActive ? 'probing' : 'pending'}`}
              >
                <div
                  className="cdn-probe-dot"
                  style={{ '--cdn-color': target.color } as React.CSSProperties}
                />
                <span className="cdn-probe-name">{target.name}</span>
                <span className="cdn-probe-status">
                  {isDone ? '✓' : isActive ? '...' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {phase === 'cdn' && (
        <div className="scan-progress-bar">
          <div
            className="scan-progress-fill"
            style={{ width: `${cdnProgress}%`, transition: 'width 0.4s ease' }}
          />
        </div>
      )}
    </div>
  );
}
