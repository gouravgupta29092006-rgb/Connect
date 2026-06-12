'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function ChatPage() {
  const router   = useRouter();
  const { id }   = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  // Redirect unauthenticated users once Firebase has resolved
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user || !id) return;

    async function init() {
      try {
        // Fix: removed /api prefix — Axios client already adds /api
        const { data } = await api.get(`/projects/${id}`);
        setProject(data.project);
      } catch (err) {
        if (err.response?.status === 401) router.push('/login');
        return;
      } finally { setLoading(false); }

      // Load chat history — Fix: removed /api prefix
      try {
        const { data } = await api.get(`/chat/${id}/messages`);
        setMessages(data.messages || []);
      } catch {}

      // Connect socket.io
      try {
        const { io } = await import('socket.io-client');
        // Backend runs on PORT 5000 (see backend/src/server.js)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const socket = io(backendUrl, {
          withCredentials: true,
          transports: ['websocket', 'polling'], // polling fallback for reliability
        });
        socketRef.current = socket;
        socket.on('connect', () => {
          setSocketReady(true);
          // Server listens for 'join_room', not 'join_project'
          socket.emit('join_room', { projectId: parseInt(id, 10) });
        });
        socket.on('new_message', msg => {
          setMessages(m => [...m, msg]);
        });
        socket.on('error', err => {
          console.error('Socket error:', err.message);
        });
        socket.on('disconnect', () => setSocketReady(false));
      } catch (err) {
        console.error('Socket init failed:', err);
      }
    }
    init();
    return () => {
      if (socketRef.current) {
        // Politely leave the room before disconnecting
        if (socketRef.current.connected) {
          socketRef.current.emit('leave_room', { projectId: parseInt(id, 10) });
        }
        socketRef.current.disconnect();
      }
    };
  }, [id, authLoading, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      if (socketRef.current?.connected) {
        // projectId must be a number (socket server does integer operations on it)
        socketRef.current.emit('send_message', { projectId: parseInt(id, 10), content: text });
      } else {
        // Socket not connected — optimistically add message to UI
        // and refresh history from REST endpoint
        const optimistic = {
          id: `opt_${Date.now()}`,
          content: text,
          sender_id: user?.id,
          sender_name: user?.full_name || 'You',
          created_at: new Date().toISOString(),
        };
        setMessages(m => [...m, optimistic]);
        // Refresh from server after a short delay to get the persisted version
        setTimeout(async () => {
          try {
            const { data } = await api.get(`/chat/${id}/messages`);
            setMessages(data.messages || []);
          } catch {}
        }, 1500);
      }
    } catch (err) {
      console.error('Send failed:', err);
      setInput(text);
    } finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  }

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Chat header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/projects/${id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'var(--text-muted)', transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,var(--cyan),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#000' }}>hub</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15 }}>{project?.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`dot ${socketReady ? 'dot-green' : 'dot-amber'}`} />
              {socketReady ? 'Real-time sync active' : 'Connecting...'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/projects/${id}`} className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
              Project
            </Link>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 20px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 28 }}>forum</span>
              </div>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, marginBottom: 8 }}>Start the Conversation</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Be the first to message your team on this project.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id || msg.user_id === user?.id;
              const senderName = msg.sender_name || msg.user_name || 'Engineer';
              const prevSender = i > 0 && (messages[i-1].sender_id === msg.sender_id || messages[i-1].user_id === msg.user_id);
              return (
                <div key={msg.id || i} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                  {!prevSender && !isOwn && (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--purple),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{senderName[0].toUpperCase()}</span>
                    </div>
                  )}
                  {prevSender && !isOwn && <div style={{ width: 30, flexShrink: 0 }} />}
                  <div style={{ maxWidth: '70%' }}>
                    {!prevSender && !isOwn && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>{senderName}</div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'var(--bg-card)',
                      border: isOwn ? 'none' : '1px solid var(--border)',
                      color: isOwn ? '#000' : 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: isOwn ? 'right' : 'left', paddingLeft: 4, paddingRight: 4, fontFamily: 'JetBrains Mono' }}>
                      {new Date(msg.created_at || msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                className="input"
                rows={1}
                placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ resize: 'none', padding: '12px 16px', minHeight: 46, maxHeight: 120, lineHeight: 1.5, overflowY: 'auto' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 20px', flexShrink: 0 }} disabled={sending || !input.trim()}>
              {sending ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <span className="material-symbols-outlined">send</span>}
            </button>
          </form>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`dot ${socketReady ? 'dot-green' : 'dot-amber'}`} style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              {socketReady ? 'Socket.io connected — real-time sync active' : 'Polling mode — reconnecting...'}
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
