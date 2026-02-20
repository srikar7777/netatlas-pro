'use client';

interface ScanOverlayProps {
  isActive: boolean;
  currentServer?: string;
}

export default function ScanOverlay({ isActive, currentServer }: ScanOverlayProps) {
  if (!isActive) return null;

  return (
    <div className="scan-overlay active">
      <div className="radar-container">
        <div className="radar-sweep"></div>
        <div className="radar-center"></div>
      </div>
      <div className="scan-text">
        {currentServer ? `TESTING ${currentServer.toUpperCase()}...` : 'ESTABLISHING CONNECTIONS...'}
      </div>
      <div className="scan-servers">Virginia • Texas • Chicago • California</div>
    </div>
  );
}
