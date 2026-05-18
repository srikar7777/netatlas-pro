'use client';

import { useEffect, useState, useRef } from 'react';
import { Measurement, CdnProbe } from '@/types';
import { CDN_TARGETS } from '@/lib/cdnProbe';

interface SidePanelProps {
  measurement: Measurement | null;
  showRoutes: boolean;
  onToggleRoutes: () => void;
  onClose: () => void;
}

type Tab = 'connectivity' | 'cdn';

function useCountUp(target: number, duration = 800, active = false) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, active]);

  return value;
}

const CDN_COLOR_MAP: Record<string, string> = Object.fromEntries(
  CDN_TARGETS.map((t) => [t.name, t.color])
);

function AnimatedBar({ value, max, color, delay = 0, active }: {
  value: number; max: number; color: string; delay?: number; active: boolean;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!active) { setWidth(0); return; }
    const t = setTimeout(() => setWidth((value / max) * 100), delay);
    return () => clearTimeout(t);
  }, [value, max, delay, active]);

  return (
    <div className="cdn-bar-track">
      <div
        className="cdn-bar-fill"
        style={{
          width: `${width}%`,
          background: color,
          boxShadow: `0 0 8px ${color}60`,
          transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}

export default function SidePanel({ measurement, showRoutes, onToggleRoutes, onClose }: SidePanelProps) {
  const isOpen = !!measurement;
  const cdnProbe = measurement?.cdn_probe ?? null;
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>('connectivity');
  const [animActive, setAnimActive] = useState(false);

  // Determine default tab based on what data is available
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
          setTimeout(() => setAnimActive(true), 200);
        });
      });
      if (cdnProbe && !measurement) setTab('cdn');
      else setTab('connectivity');
    } else {
      setVisible(false);
      setAnimActive(false);
      const t = setTimeout(() => setMounted(false), 450);
      return () => clearTimeout(t);
    }
  }, [isOpen, cdnProbe, measurement]);

  const reliability = useCountUp(measurement?.reliability ?? 0, 900, animActive && tab === 'connectivity');
  const latency = useCountUp(measurement?.latency ?? 0, 700, animActive && tab === 'connectivity');
  const jitter = useCountUp(measurement?.jitter ?? 0, 700, animActive && tab === 'connectivity');

  if (!mounted) return null;

  const formatTimeAgo = (timestamp: number) => {
    const s = Math.floor((Date.now() - timestamp) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const getStability = (jitter: number, packetLoss: number) => {
    if (jitter < 5 && packetLoss === 0) return 'Excellent';
    if (jitter < 10 && packetLoss < 0.5) return 'Good';
    if (jitter < 20 && packetLoss < 1) return 'Fair';
    return 'Poor';
  };

  const getSuitability = (type: string, data: Measurement) => {
    switch (type) {
      case 'gaming': return data.latency < 20 && data.jitter < 5 && data.packet_loss === 0 ? 'Excellent' : data.latency < 50 ? 'Good' : 'Fair';
      case 'video': return data.latency < 100 && data.jitter < 30 && data.packet_loss < 1 ? 'Excellent' : data.latency < 150 ? 'Good' : 'Fair';
      case 'streaming': return data.latency < 50 && data.packet_loss < 0.5 ? 'Excellent' : data.latency < 100 ? 'Good' : 'Fair';
      case 'work': return data.latency < 150 && data.packet_loss < 2 ? 'Excellent' : 'Poor';
      default: return 'Fair';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Excellent': return 'suit-status excellent';
      case 'Good': return 'suit-status good';
      case 'Fair': return 'suit-status fair';
      default: return 'suit-status poor';
    }
  };

  const getReliabilityColor = (r: number) =>
    r >= 90 ? 'var(--accent-green)' :
    r >= 75 ? 'var(--accent-teal)' :
    r >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  const getCdnStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--accent-green)';
      case 'good': return 'var(--accent-teal)';
      case 'fair': return 'var(--accent-yellow)';
      case 'poor': return 'var(--accent-red)';
      default: return 'var(--text-secondary)';
    }
  };

  const displayData = measurement;
  const hasBothTabs = measurement && cdnProbe;

  return (
    <div className={`side-panel ${visible ? 'active' : ''}`}>
      {/* Header */}
      <div className="panel-header">
        <button className="close-btn" onClick={onClose} aria-label="Close panel">×</button>
        <div
          className={`location-badge ${animActive ? 'badge-animate' : ''}`}
          style={{ animationDelay: '0.1s' }}
        >
          {displayData?.neighborhood?.toUpperCase()}, {displayData?.city?.toUpperCase()}
        </div>
        <div className="panel-timestamp">
          {displayData ? formatTimeAgo(displayData.timestamp) : ''}
        </div>

        {/* Tabs — only show if both datasets exist */}
        {hasBothTabs && (
          <div className="panel-tabs">
            <button
              className={`panel-tab ${tab === 'connectivity' ? 'active' : ''}`}
              onClick={() => { setTab('connectivity'); setAnimActive(false); setTimeout(() => setAnimActive(true), 50); }}
            >
              <span className="tab-dot connectivity-dot" />
              CONNECTIVITY
            </button>
            <button
              className={`panel-tab ${tab === 'cdn' ? 'active' : ''}`}
              onClick={() => { setTab('cdn'); setAnimActive(false); setTimeout(() => setAnimActive(true), 50); }}
            >
              <span className="tab-dot cdn-dot" />
              CDN INTEL
            </button>
          </div>
        )}

        {/* Single tab label when only one type */}
        {!hasBothTabs && (
          <div className="panel-tabs">
            <button className="panel-tab active">
              <span className={`tab-dot ${cdnProbe ? 'cdn-dot' : 'connectivity-dot'}`} />
              {cdnProbe ? 'CDN INTEL' : 'CONNECTIVITY'}
            </button>
          </div>
        )}
      </div>

      <div className="panel-content">
        {/* ── CONNECTIVITY TAB ── */}
        {(tab === 'connectivity' || !hasBothTabs) && measurement && (
          <div className="tab-content">
            <div className="metric-grid">
              {/* Reliability score */}
              <div className={`metric-card stagger-1 ${animActive ? 'card-enter' : ''}`}>
                <div className="metric-label">RELIABILITY SCORE</div>
                <div className="metric-value" style={{ color: getReliabilityColor(measurement.reliability) }}>
                  {reliability}
                  <span className="metric-unit">/100</span>
                </div>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: animActive ? `${measurement.reliability}%` : '0%',
                      background: `linear-gradient(90deg, ${getReliabilityColor(measurement.reliability)}, ${getReliabilityColor(measurement.reliability)}88)`,
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
                    }}
                  />
                </div>
              </div>

              {/* Latency + Jitter */}
              <div className="metric-row">
                <div className={`metric-item stagger-2 ${animActive ? 'card-enter' : ''}`}>
                  <div className="metric-label">LATENCY</div>
                  <div className="metric-value small">{latency}<span className="metric-unit-small">ms</span></div>
                </div>
                <div className={`metric-item stagger-3 ${animActive ? 'card-enter' : ''}`}>
                  <div className="metric-label">JITTER</div>
                  <div className="metric-value small">{jitter}<span className="metric-unit-small">ms</span></div>
                </div>
              </div>

              {/* Packet loss + Stability */}
              <div className="metric-row">
                <div className={`metric-item stagger-4 ${animActive ? 'card-enter' : ''}`}>
                  <div className="metric-label">PACKET LOSS</div>
                  <div className="metric-value small">{measurement.packet_loss ?? 0}<span className="metric-unit-small">%</span></div>
                </div>
                <div className={`metric-item stagger-5 ${animActive ? 'card-enter' : ''}`}>
                  <div className="metric-label">STABILITY</div>
                  <div className="metric-value small">{getStability(measurement.jitter, measurement.packet_loss ?? 0)}</div>
                </div>
              </div>
            </div>

            {/* Use suitability */}
            <div className={`suitability-section stagger-6 ${animActive ? 'card-enter' : ''}`}>
              <h3>USE SUITABILITY</h3>
              <div className="suitability-grid">
                {(['gaming', 'video', 'streaming', 'work'] as const).map((type, i) => (
                  <div
                    key={type}
                    className="suit-item"
                    style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                  >
                    <div className="suit-icon">
                      {type === 'gaming' && '🎮'}
                      {type === 'video' && '📹'}
                      {type === 'streaming' && '🎬'}
                      {type === 'work' && '💼'}
                    </div>
                    <div className="suit-label">
                      {type === 'gaming' && 'Gaming'}
                      {type === 'video' && 'Video Calls'}
                      {type === 'streaming' && 'Streaming'}
                      {type === 'work' && 'Remote Work'}
                    </div>
                    <div className={getStatusClass(getSuitability(type, measurement))}>
                      {getSuitability(type, measurement)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="meta-info">
              <div className="meta-item">
                <span className="meta-label">Measured</span>
                <span className="meta-value">{formatTimeAgo(measurement.timestamp)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Confidence</span>
                <span className="meta-value" style={{ color: 'var(--accent-green)' }}>High</span>
              </div>
            </div>
          </div>
        )}

        {/* ── CDN INTEL TAB ── */}
        {(tab === 'cdn' || !hasBothTabs) && cdnProbe && (
          <div className="tab-content">
            {/* Route visualization toggle */}
            {cdnProbe && (
              <button
                className={`route-toggle-btn ${showRoutes ? 'active' : ''}`}
                onClick={onToggleRoutes}
              >
                <span className="route-toggle-icon">{showRoutes ? '◉' : '○'}</span>
                <span>{showRoutes ? 'HIDE ROUTES ON MAP' : 'SHOW ROUTES ON MAP'}</span>
              </button>
            )}

            {/* Summary cards */}
            <div className="cdn-summary-row">
              <div className={`cdn-summary-card stagger-1 ${animActive ? 'card-enter' : ''}`}>
                <div className="metric-label">BEST CDN</div>
                <div
                  className="cdn-summary-value"
                  style={{ color: CDN_COLOR_MAP[cdnProbe.bestCdn] || 'var(--accent-cyan)' }}
                >
                  {cdnProbe.bestCdn || '—'}
                </div>
              </div>
              <div className={`cdn-summary-card stagger-2 ${animActive ? 'card-enter' : ''}`}>
                <div className="metric-label">AVG LATENCY</div>
                <div className="cdn-summary-value" style={{ color: 'var(--accent-cyan)' }}>
                  {cdnProbe.avgLatency}
                  <span className="metric-unit-small">ms</span>
                </div>
              </div>
            </div>

            {cdnProbe.deadZone && (
              <div className={`dead-zone-alert stagger-2 ${animActive ? 'card-enter' : ''}`}>
                <span className="dead-zone-icon">⚠</span>
                CDN DEAD ZONE — All providers showing high latency
              </div>
            )}

            {/* Per-CDN breakdown */}
            <div className="cdn-breakdown-section">
              <div className="metric-label" style={{ marginBottom: '14px' }}>CDN LATENCY BREAKDOWN</div>
              {cdnProbe.results
                .slice()
                .sort((a, b) => a.latency - b.latency)
                .map((result, i) => {
                  const color = CDN_COLOR_MAP[result.cdn] || '#00f0ff';
                  const maxLatency = Math.max(...cdnProbe.results.map((r) => r.latency === 9999 ? 0 : r.latency), 200);
                  const isTimeout = result.status === 'timeout';

                  return (
                    <div
                      key={result.cdn}
                      className={`cdn-row stagger-${Math.min(i + 2, 8)} ${animActive ? 'card-enter' : ''}`}
                    >
                      <div className="cdn-row-header">
                        <div className="cdn-row-name">
                          <span className="cdn-color-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                          {result.cdn}
                          {result.cdn === cdnProbe.bestCdn && (
                            <span className="cdn-best-badge">BEST</span>
                          )}
                        </div>
                        <div className="cdn-row-right">
                          {!isTimeout && (
                            <span className="cdn-edge-node">{result.edgeNode}</span>
                          )}
                          <span
                            className="cdn-latency-val"
                            style={{ color: isTimeout ? 'var(--text-secondary)' : getCdnStatusColor(result.status) }}
                          >
                            {isTimeout ? 'TIMEOUT' : `${result.latency}ms`}
                          </span>
                        </div>
                      </div>
                      {!isTimeout && (
                        <AnimatedBar
                          value={result.latency}
                          max={maxLatency}
                          color={color}
                          delay={i * 80}
                          active={animActive}
                        />
                      )}
                      {!isTimeout && (
                        <div className="cdn-row-meta">
                          <span className={`cdn-status-badge ${result.status}`}>{result.status.toUpperCase()}</span>
                          {result.cached && <span className="cdn-cached-badge">CACHED</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="meta-info" style={{ marginTop: '20px' }}>
              <div className="meta-item">
                <span className="meta-label">Probed</span>
                <span className="meta-value">{formatTimeAgo(cdnProbe.timestamp)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">CDNs Tested</span>
                <span className="meta-value">{cdnProbe.results.length}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Worst CDN</span>
                <span className="meta-value" style={{ color: 'var(--accent-red)' }}>{cdnProbe.worstCdn}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
