import { useState, useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import { apiGet } from './api'
import './messages.css'

// Parse "Interested in X at Y.\nNote: Z" into { quote, note } or null
function parseInterestMessage(content) {
  if (!content) return null
  const match = content.match(/^Interested in (.+?) at (.+?)\.\nNote: (.+)$/s)
  if (!match) return null
  return {
    species: match[1],
    location: match[2],
    note: match[3]
  }
}

function MessageBubble({ message, isMine }) {
  const interest = parseInterestMessage(message.content)

  return (
    <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
      {interest ? (
        <>
          <div className="message-reply-quote">
            <div className="message-reply-bar" />
            <div className="message-reply-body">
              <span className="message-reply-label">📋 Listing Interest</span>
              <span className="message-reply-detail">{interest.species} · {interest.location}</span>
            </div>
          </div>
          <div className="message-content">{interest.note}</div>
        </>
      ) : (
        <div className="message-content">{message.content}</div>
      )}
      <div className="message-time">
        {new Date(message.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
    </div>
  )
}

export default function Messages({ token, userProfile, initialContact }) {
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [connected, setConnected] = useState(false)
  const stompClientRef = useRef(null)
  const messagesEndRef = useRef(null)
  const initialContactIdRef = useRef(null)

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet('/messages/users', token)
      setContacts(data)
      return data
    } catch (e) {
      console.error(e)
      return []
    }
  }, [token])

  // On mount: load contacts, then resolve initialContact
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadContacts()
      if (cancelled) return
      if (initialContact) {
        // Find the existing contact by ID to avoid duplicates
        const existing = data.find(c => c.id === initialContact.id)
        if (existing) {
          setActiveContact(existing)
        } else {
          // New conversation target — add to list
          setContacts(prev => [initialContact, ...prev])
          setActiveContact(initialContact)
        }
        initialContactIdRef.current = initialContact.id
      }
    })()
    return () => { cancelled = true }
  }, []) // only on mount

  // When initialContact prop changes (user clicks Message on a different fisherman)
  useEffect(() => {
    if (!initialContact) return
    // Skip if it's the same contact we already handled
    if (initialContact.id === initialContactIdRef.current) return
    initialContactIdRef.current = initialContact.id

    // Check current contacts list
    setContacts(prev => {
      const exists = prev.some(c => c.id === initialContact.id)
      if (exists) return prev
      return [initialContact, ...prev]
    })
    setActiveContact(initialContact)
  }, [initialContact])

  useEffect(() => {
    const client = new Client({
      brokerURL: `ws://localhost:8080/api/ws-chat`,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/user/queue/messages', (msg) => {
          const body = JSON.parse(msg.body)
          setMessages(prev => {
            if (prev.some(m => m.id === body.id)) return prev;
            return [...prev, body]
          })
          
          loadContacts() // refresh contacts in case it's a new sender
        })
      },
      onDisconnect: () => {
        setConnected(false)
      }
    })

    client.activate()
    stompClientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [loadContacts])

  const loadConversation = useCallback(async (userId) => {
    try {
      const data = await apiGet(`/messages/${userId}`, token)
      setMessages(data)
    } catch(e) {
      console.error(e)
    }
  }, [token])

  useEffect(() => {
    if (activeContact) {
      loadConversation(activeContact.id)
    }
  }, [activeContact, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeContact || !stompClientRef.current) return

    const destination = "/app/chat.send"
    const payload = {
      recipientId: activeContact.id,
      content: newMessage.trim()
    }

    stompClientRef.current.publish({
      destination,
      body: JSON.stringify(payload)
    })
    
    setNewMessage('')
  }

  return (
    <div className="messages-container">
      <div className="contacts-sidebar">
        <h2 style={{ padding: '16px', margin: 0, borderBottom: '1px solid var(--border)' }}>Conversations</h2>
        {contacts.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--text-3)' }}>No conversations yet.</p>
        ) : (
          <div className="contact-list">
            {contacts.map(c => (
              <div 
                key={c.id} 
                className={`contact-item ${activeContact?.id === c.id ? 'active' : ''}`}
                onClick={() => setActiveContact(c)}
              >
                <div className="contact-avatar">{c.fullName.charAt(0)}</div>
                <div className="contact-info">
                  <div className="contact-name">{c.fullName}</div>
                  <div className="contact-role">{c.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-area">
        {activeContact ? (
          <>
            <div className="chat-header">
              <h3>{activeContact.fullName}</h3>
              <span className={`status-dot ${connected ? 'online' : 'offline'}`} title={connected ? "Connected" : "Disconnected"}></span>
            </div>
            <div className="messages-list">
              {messages.map(m => (
                <MessageBubble 
                  key={m.id} 
                  message={m} 
                  isMine={m.senderId === userProfile.id} 
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-area" onSubmit={send}>
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!connected}
              />
              <button type="submit" disabled={!newMessage.trim() || !connected}>Send</button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
