import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3000

export default function PaymentReturn({ setDashboardPage }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [status, setStatus] = useState('polling')
  const attemptsRef = useRef(0)

  const handleNavigateBack = () => {
    if (setDashboardPage) {
      setDashboardPage('borders')
      navigate('/', { replace: true })
    } else {
      navigate('/buyer/orders')
    }
  }

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
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', padding: '40px 24px', width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="dot" />Payment</div>
          <h1 className="page__title" style={{ marginTop: 8, fontSize: 30 }}>
            {status === 'polling'   && <>Confirming your <em>payment</em></>}
            {status === 'confirmed' && <>Payment <em>confirmed</em></>}
            {status === 'timeout'   && <>Payment <em>processing</em></>}
            {status === 'error'     && <>Something went <em>wrong</em></>}
          </h1>
          <p className="page__sub" style={{ marginTop: 8, fontSize: 13.5, color: 'var(--muted-2)', textAlign: 'center' }}>
            {status === 'polling'   && 'Waiting for confirmation from the payment gateway.'}
            {status === 'confirmed' && `Order #${orderId} has been paid successfully.`}
            {status === 'timeout'   && 'Your payment is still being confirmed — this can take a minute.'}
            {status === 'error'     && 'No order ID was found in the URL.'}
          </p>
        </div>

        <div className="card" style={{
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.3s ease',
        }}>
          {status === 'polling' && (
            <>
              <div style={{ position: 'relative', width: 80, height: 80, display: 'grid', placeItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  width: 56, height: 56, borderRadius: '50%',
                  border: '3.5px solid rgba(255,255,255,0.05)',
                  borderTopColor: '#3ee2ff',
                  animation: 'spin 1s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(62, 226, 255, 0.2)',
                  filter: 'blur(8px)',
                  opacity: 0.15,
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              </div>
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }
              `}</style>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--on-dark)', marginBottom: 8 }}>
                  Confirming transaction…
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>Verifying with GCash / Maya via Xendit</div>
              </div>
            </>
          )}

          {status === 'confirmed' && (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(70, 211, 154, 0.12)',
                border: '1px solid rgba(70, 211, 154, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(70, 211, 154, 0.2)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--safe)', marginBottom: 8 }}>
                  Payment Successful
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted-2)' }}>
                  Order <code style={{ fontFamily: 'var(--font-mono)', padding: '2px 6px', fontSize: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>#{orderId}</code> is fully paid.
                </div>
              </div>
              <button className="btn btn--lime btn--sm" style={{ minWidth: 180, justifyContent: 'center' }} onClick={handleNavigateBack}>
                View order details
              </button>
            </>
          )}

          {status === 'timeout' && (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--caution)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--caution)', marginBottom: 8 }}>
                  Still processing
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-2)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
                  Your payment hasn't been confirmed yet. Check your Orders page — it will update automatically once confirmed.
                </div>
              </div>
              <button className="btn btn--sm btn--primary" style={{ minWidth: 180, justifyContent: 'center' }} onClick={handleNavigateBack}>
                Go to my orders
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(248, 113, 113, 0.2)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--unsafe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--unsafe)', marginBottom: 8 }}>
                  Invalid payment link
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>No order ID found in the URL.</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={handleNavigateBack}>
                Go to orders
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
