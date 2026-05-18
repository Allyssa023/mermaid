import { useQuery } from '@tanstack/react-query'
import { fetchBfarPrices } from '../api/lookup'

/**
 * Shows "BFAR ref: ₱min–₱max/kg" for a species.
 * Colors the text based on how `agreedPrice` compares to the reference:
 *   green  → at or above min
 *   yellow → within 10% below min
 *   red    → more than 10% below min
 *
 * Props:
 *   speciesId   — number, required
 *   agreedPrice — number, optional (enables colour coding)
 */
export default function BfarBadge({ speciesId, agreedPrice }) {
  const { data } = useQuery({
    queryKey: ['bfar', speciesId],
    queryFn: () => fetchBfarPrices(speciesId),
    enabled: !!speciesId,
    staleTime: 5 * 60 * 1000,
  })

  const ref = data?.[0]
  if (!ref) return null

  const min = Number(ref.minPricePerKg)
  const max = Number(ref.maxPricePerKg)

  let color = 'var(--ink-3)'
  if (agreedPrice != null) {
    const p = Number(agreedPrice)
    if (p >= min) color = 'var(--safe)'
    else if (p >= min * 0.9) color = 'var(--caution, #f59e0b)'
    else color = 'var(--unsafe)'
  }

  return (
    <span style={{
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      color,
      background: 'var(--paper)',
      border: '1px solid var(--line-soft)',
      borderRadius: 4,
      padding: '2px 6px',
      whiteSpace: 'nowrap',
    }}>
      BFAR ref ₱{min}–₱{max}/kg
    </span>
  )
}
