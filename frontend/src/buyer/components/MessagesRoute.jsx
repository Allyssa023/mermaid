import { useLocation } from 'react-router-dom'
import Messages from '../../Messages'

export default function MessagesRoute({ user }) {
  const location = useLocation()
  const initialContact = location.state?.initialContact || null
  return <Messages userProfile={user} initialContact={initialContact} />
}
