export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="ui-state ui-state-error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
