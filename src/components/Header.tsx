interface HeaderProps {
  probeCount: number;
  cdnProbeCount: number;
}

export default function Header({ probeCount, cdnProbeCount }: HeaderProps) {
  return (
    <div className="header">
      <div className="logo">
        <div className="logo-pulse" />
        <h1>NETATLAS</h1>
        <span className="logo-pro">PRO</span>
      </div>
      <div className="status">
        <span className="status-dot live" />
        <span className="status-text">LIVE OBSERVATORY</span>
        <div className="probe-stats">
          <span className="probe-stat">
            <span className="probe-stat-dot connectivity" />
            {probeCount} probe{probeCount !== 1 ? 's' : ''}
          </span>
          <span className="probe-stat-divider">·</span>
          <span className="probe-stat">
            <span className="probe-stat-dot cdn" />
            {cdnProbeCount} CDN scan{cdnProbeCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
