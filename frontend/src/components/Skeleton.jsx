// frontend/src/components/Skeleton.jsx

export function Skeleton({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div
      className="skeleton-bar"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={20} />
      <Skeleton width="55%" height={12} />
    </div>
  )
}

export function TableRowSkeleton({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width={32} height={32} radius={8} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton width={64} height={12} />
        </div>
      ))}
    </div>
  )
}

export function StatTileSkeleton() {
  return (
    <div className="stat-tile">
      <Skeleton width="50%" height={11} />
      <Skeleton width="35%" height={28} style={{ marginTop: 8 }} />
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width={56} height={20} radius={12} />
      </div>
      <Skeleton width="55%" height={18} />
      <Skeleton width="45%" height={12} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Skeleton width={100} height={32} radius={8} />
      </div>
    </div>
  )
}
