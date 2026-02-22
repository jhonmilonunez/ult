export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="ui-state ui-state-loading" role="status" aria-live="polite">
      <div className="ui-state-spinner" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
