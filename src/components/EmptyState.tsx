interface EmptyStateProps {
  isVisible: boolean;
}

export default function EmptyState({ isVisible }: EmptyStateProps) {
  if (!isVisible) return null;

  return (
    <div className="empty-state">
      <div className="empty-icon">📡</div>
      <h2>No Active Probes</h2>
      <p>Be the first to measure internet reliability in your area</p>
    </div>
  );
}
