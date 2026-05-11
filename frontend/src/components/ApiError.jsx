// frontend/src/components/ApiError.jsx
export default function ApiError({ error, onRetry, compact = false }) {
  const msg = error?.message || 'Something went wrong'
  if (compact) {
    return (
      <div className="api-error api-error--compact">
        <span>{msg}</span>
        {onRetry && <button className="btn btn--ghost btn--sm" onClick={onRetry}>Retry</button>}
      </div>
    )
  }
  return (
    <div className="api-error">
      <p className="api-error__msg">{msg}</p>
      {onRetry && (
        <button className="btn btn--secondary" onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}
