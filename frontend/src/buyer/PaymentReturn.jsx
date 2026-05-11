import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3000

export default function PaymentReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [status, setStatus] = useState('polling')
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!orderId) { setStatus('error'); return }

    const poll = async () => {
      attemptsRef.current += 1
      try {
        const o = await apiGet(`/buyer/orders/${orderId}`)
        if (o?.paymentStatus === 'CONFIRMED' || o?.payment?.status === 'CONFIRMED') {
          setStatus('confirmed'); return
        }
      } catch { /* keep polling */ }

      if (attemptsRef.current >= MAX_ATTEMPTS) { setStatus('timeout'); return }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    setTimeout(poll, POLL_INTERVAL_MS)
  }, [orderId])

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="eyebrow">Payment</div>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            {status === 'polling'   && <>Confirming your <em>payment</em></>}
            {status === 'confirmed' && <>Payment <em>confirmed</em></>}
            {status === 'timeout'   && <>Payment <em>processing</em></>}
            {status === 'error'     && <>Something went <em>wrong</em></>}
          </h1>
          <p className="page__sub">
            {status === 'polling'   && 'Waiting for confirmation from the payment gateway.'}
            {status === 'confirmed' && `Order #${orderId} has been paid successfully.`}
            {status === 'timeout'   && 'Your payment is still being confirmed — this can take a minute.'}
            {status === 'error'     && 'No order ID was found in the URL.'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {status === 'polling' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid var(--line)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>
                Confirming with payment gateway…
              </div>
              <div className="muted-data">This usually takes a few seconds.</div>
            </div>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--safe-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--safe)', marginBottom: 6 }}>
                Payment confirmed
              </div>
              <div className="muted-data">Order #{orderId} · paid in full</div>
            </div>
            <button className="btn btn--primary" onClick={() => navigate(`/buyer/orders/${orderId}`)}>
              View order details
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--caution-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--caution)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>
                Still processing
              </div>
              <div className="muted-data" style={{ maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
                Your payment hasn't been confirmed yet. Check your Orders page — it will update automatically once confirmed.
              </div>
            </div>
            <button className="btn btn--primary" onClick={() => navigate('/buyer/orders')}>
              Go to my orders
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--unsafe-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--unsafe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>
                Invalid payment link
              </div>
              <div className="muted-data">No order ID found in the URL.</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/buyer/orders')}>
              Go to orders
            </button>
          </>
        )}
      </div>
    </div>
  )
}
