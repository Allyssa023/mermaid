import { useState } from 'react'
import { I } from '../../icons'
import { useFavorites } from '../../context/FavoritesContext'

export default function FavoriteHeart({ targetType, targetId, size = 14, label = 'Save', stopPropagation = true }) {
  const { isFavorited, toggle } = useFavorites()
  const [busy, setBusy] = useState(false)
  const active = isFavorited(targetType, targetId)
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={async (e) => {
        if (stopPropagation) e.stopPropagation()
        if (busy) return
        setBusy(true)
        await toggle(targetType, targetId)
        setBusy(false)
      }}
      aria-label={active ? `Remove ${label}` : `Save ${label}`}
      title={active ? 'Saved' : 'Save'}
      style={{
        color: active ? 'var(--accent, #f5a524)' : 'var(--ink-4, #999)',
        padding: '4px 8px',
      }}
    >
      <I.Star size={size} />
    </button>
  )
}

export function SavedCountBadge() {
  const { favorites } = useFavorites()
  return (
    <button className="btn btn--ghost">
      {favorites.length} saved <I.Star size={12} />
    </button>
  )
}
