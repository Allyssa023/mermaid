import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3000

export default function PaymentReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [status, setStatus] = useState('polling') // 'polling' | 'confirmed' | 'timeout' | 'error'
  const [order, setOrder] = useState(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!orderId) {
      setStatus('error')
      return
    }

    const poll = async () => {
      attemptsRef.current += 1
      try {
        const o = await apiGet(`/buyer/orders/${orderId}`)
        setOrder(o)
        if (o?.paymentStatus === 'CONFIRMED' || o?.payment?.status === 'CONFIRMED') {
          setStatus('confirmed')
          return
        }
      } catch {
        // keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus('timeout')
        return
      }

      setTimeout(poll, POLL_INTERVAL_MS)
    }

    setTimeout(poll, POLL_INTERVAL_MS)
  }, [orderId])

  if (status === 'polling') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 40 }}>&#x231B;</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Confirming your payment&hellip;</div>
        <div className="muted-data" style={{ fontSize: 13 }}>This usually takes a few seconds.</div>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 48 }}>&#10003;</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--safe)' }}>Payment confirmed!</div>
        <div className="muted-data" style={{ fontSize: 14 }}>
          Order #{orderId} has been paid successfully.
        </div>
        <button
          className="btn btn--accent"
          onClick={() => navigate(`/buyer/orders/${orderId}`)}
          style={{ marginTop: 12 }}
        >
          View order
        </button>
      </div>
    )
  }

  if (status === 'timeout') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
        <div style={{ fontSize: 40 }}>&#x1F550;</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Payment is being processed</div>
        <div className="muted-data" style={{ fontSize: 14, textAlign: 'center', maxWidth: 340 }}>
          Your payment is still being confirmed. This can take a minute or two &mdash; check your Orders page for the latest status.
        </div>
        <button
          className="btn btn--accent"
          onClick={() => navigate('/buyer/orders')}
          style={{ marginTop: 12 }}
        >
          Go to my orders
        </button>
      </div>
    )
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 20 }}>
      <div style={{ fontSize: 40 }}>&#x26A0;&#xFE0F;</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
      <div className="muted-data" style={{ fontSize: 13 }}>No order ID found in the URL.</div>
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/buyer/orders')}>
        Go to orders
      </button>
    </div>
  )
}
