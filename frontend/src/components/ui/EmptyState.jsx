export function EmptyState({ message = 'No data found.', actionLabel, onAction }) {
  return (
    <div className="ui-state ui-state-empty">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="secondary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
