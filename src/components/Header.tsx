interface HeaderProps {
  probeCount: number;
}

export default function Header({ probeCount }: HeaderProps) {
  return (
    <div className="header">
      <div className="logo">
        <div className="logo-pulse"></div>
        <h1>NETATLAS</h1>
      </div>
      <div className="status">
        <span className="status-dot live"></span>
        <span className="status-text">LIVE OBSERVATORY</span>
        <span className="probe-count">
          {probeCount} probe{probeCount !== 1 ? 's' : ''} active
        </span>
      </div>
    </div>
  );
}
