export function PageHead({ eyebrow, sub, title, lime, tools }) {
  return (
    <div className="page-head">
      <div className="page-head__eyebrow">
        {eyebrow}
        {sub && <span className="page-head__count">{sub}</span>}
      </div>
      <div className="page-head__row">
        <h1 className="page-head__title">
          {title}
          {lime && (
            <em style={{
              background: 'var(--accent)',
              color: 'var(--ink-deep)',
              padding: '2px 10px',
              borderRadius: 6,
              fontStyle: 'normal',
              marginLeft: 8,
            }}>{lime}</em>
          )}
        </h1>
        {tools && <div className="page-head__filters">{tools}</div>}
      </div>
    </div>
  )
}
