'use client';

interface TestButtonProps {
  onClick: () => void;
  isRunning: boolean;
}

export default function TestButton({ onClick, isRunning }: TestButtonProps) {
  return (
    <button 
      className="test-button" 
      onClick={onClick}
      disabled={isRunning}
      style={{ opacity: isRunning ? 0.6 : 1 }}
    >
      <div className="btn-glow"></div>
      <span className="btn-text">
        {isRunning ? 'RUNNING TEST...' : 'RUN TEST AT MY LOCATION'}
      </span>
      <span className="btn-sub">
        {isRunning ? 'Please wait' : 'Measure your connectivity quality'}
      </span>
    </button>
  );
}
