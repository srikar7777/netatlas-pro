'use client';

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

interface SidePanelProps {
  measurement: Measurement | null;
  onClose: () => void;
}

export default function SidePanel({ measurement, onClose }: SidePanelProps) {
  if (!measurement) return null;

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStability = (jitter: number, packetLoss: number) => {
    if (jitter < 5 && packetLoss === 0) return 'Excellent';
    if (jitter < 10 && packetLoss < 0.5) return 'Good';
    if (jitter < 20 && packetLoss < 1) return 'Fair';
    return 'Poor';
  };

  const getSuitability = (type: string, data: Measurement) => {
    switch (type) {
      case 'gaming':
        return data.latency < 20 && data.jitter < 5 && data.packetLoss === 0 ? 'Excellent' : data.latency < 50 ? 'Good' : 'Fair';
      case 'video':
        return data.latency < 100 && data.jitter < 30 && data.packetLoss < 1 ? 'Excellent' : data.latency < 150 ? 'Good' : 'Fair';
      case 'streaming':
        return data.latency < 50 && data.packetLoss < 0.5 ? 'Excellent' : data.latency < 100 ? 'Good' : 'Fair';
      case 'work':
        return data.latency < 150 && data.packetLoss < 2 ? 'Excellent' : 'Poor';
      default:
        return 'Fair';
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

  return (
    <div className={`side-panel ${measurement ? 'active' : ''}`}>
      <div className="panel-header">
        <button className="close-btn" onClick={onClose}>×</button>
        <div className="location-badge">
          {measurement.neighborhood?.toUpperCase()}, {measurement.city?.toUpperCase()}
        </div>
      </div>

      <div className="panel-content">
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">RELIABILITY SCORE</div>
            <div 
              className="metric-value" 
              style={{ 
                color: measurement.reliability >= 90 ? 'var(--accent-green)' : 
                       measurement.reliability >= 75 ? 'var(--accent-teal)' : 
                       measurement.reliability >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'
              }}
            >
              {measurement.reliability}
            </div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ width: `${measurement.reliability}%` }}
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-item">
              <div className="metric-label">LATENCY</div>
              <div className="metric-value small">{measurement.latency} ms</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">JITTER</div>
              <div className="metric-value small">{measurement.jitter} ms</div>
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-item">
              <div className="metric-label">PACKET LOSS</div>
              <div className="metric-value small">{measurement.packetLoss}%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">STABILITY</div>
              <div className="metric-value small">{getStability(measurement.jitter, measurement.packetLoss)}</div>
            </div>
          </div>
        </div>

        <div className="suitability-section">
          <h3>USE SUITABILITY</h3>
          <div className="suitability-grid">
            {['gaming', 'video', 'streaming', 'work'].map((type) => (
              <div key={type} className="suit-item">
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
            <span className="meta-label">Last Measured:</span>
            <span className="meta-value">{formatTimeAgo(measurement.timestamp)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Confidence:</span>
            <span className="meta-value">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
