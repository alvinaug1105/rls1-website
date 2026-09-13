export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="stage-badge" data-stage={status}>
      <span aria-hidden="true">{status === 'FINISHED' ? '✓' : '●'}</span>
      {status === 'FINISHED' ? 'COMPLETED' : status}
    </span>
  );
}
