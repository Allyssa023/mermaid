// frontend/src/components/OrderTimeline.jsx

const TYPE_A_STEPS = ['Created', 'Confirmed', 'Handoff', 'Paid', 'Completed']
const TYPE_B_STEPS = ['New', 'Preparing', 'Ready', 'Completed']

const STATUS_TO_STEP_A = {
  PENDING: 0, CONFIRMED: 1,
  HANDOFF_PENDING: 2, HANDOFF_CONFIRMED: 2,
  PAYMENT_PENDING: 3, PAYMENT_CONFIRMED: 3,
  COMPLETED: 4, CANCELLED: -1, DISPUTED: 2,
}
const STATUS_TO_STEP_B = {
  NEW: 0, PREPARING: 1, READY: 2, COMPLETED: 3, CANCELLED: -1,
}

export default function OrderTimeline({ events = [], orderType = 'A', currentStatus }) {
  const steps = orderType === 'A' ? TYPE_A_STEPS : TYPE_B_STEPS
  const stepMap = orderType === 'A' ? STATUS_TO_STEP_A : STATUS_TO_STEP_B
  const currentStep = stepMap[currentStatus] ?? 0
  const isCancelled = currentStatus === 'CANCELLED'

  return (
    <div className="order-timeline">
      {steps.map((label, i) => {
        const done    = !isCancelled && i < currentStep
        const active  = !isCancelled && i === currentStep
        const event   = events.find(e => stepMap[e.status] === i)
        return (
          <div key={label} className={`timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="timeline-step__dot">{done ? '✓' : i + 1}</div>
            <div className="timeline-step__label">{label}</div>
            {event && <div className="timeline-step__ts">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            {i < steps.length - 1 && <div className="timeline-step__line" />}
          </div>
        )
      })}
      {isCancelled && <div className="timeline-cancelled">Cancelled</div>}
    </div>
  )
}
