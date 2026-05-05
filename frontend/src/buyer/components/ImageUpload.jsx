import { useState, useRef } from 'react'
import { apiUpload } from '../../api'
import { I } from '../../icons'

export default function ImageUpload({ value, onChange, subDir = 'general', label = 'Upload image', size = 96 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError('Only JPEG, PNG, or WebP images.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Max 5MB.')
      return
    }
    setBusy(true); setError('')
    try {
      const res = await apiUpload('/uploads', file, { subDir })
      onChange?.(res?.url || null)
    } catch (e) {
      setError(e?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--surface-2)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer', border: '1px dashed var(--border, #d4d4d4)',
          flexShrink: 0,
        }}
        title={label}
      >
        {value ? (
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <I.Plus size={20} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : value ? 'Change image' : label}
        </button>
        {value && !busy && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onChange?.(null)}
            style={{ color: 'var(--unsafe)' }}
          >Remove</button>
        )}
        {error && <div style={{ color: 'var(--unsafe)', fontSize: 12 }}>{error}</div>}
      </div>
    </div>
  )
}
