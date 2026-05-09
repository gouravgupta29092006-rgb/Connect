'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getChatMessages, getProject } from '@/lib/api';
import { io } from 'socket.io-client';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.id);

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load project info + history
  useEffect(() => {
    if (!user || !projectId) return;
    getProject(projectId)
      .then(({ data }) => setProject(data.project))
      .catch(() => router.push('/projects'));
    getChatMessages(projectId)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => {});
  }, [user, projectId, router]);

  // Socket connection
  useEffect(() => {
    if (!user || !projectId) return;

    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', { projectId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_joined', (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, content: `${data.fullName} joined the chat`, system: true, created_at: new Date().toISOString() },
      ]);
    });

    socket.on('user_left', (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, content: `${data.fullName} left the chat`, system: true, created_at: new Date().toISOString() },
      ]);
    });

    return () => {
      socket.emit('leave_room', { projectId });
      socket.disconnect();
    };
  }, [user, projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { projectId, content: newMsg.trim() });
    setNewMsg('');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Chat header */}
      <div className="glass px-4 py-3 flex items-center justify-between"
           style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            ← Back
          </Link>
          <div>
            <p className="font-semibold text-sm">{project?.title || 'Loading...'}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full"
                   style={{ background: connected ? 'var(--accent)' : 'var(--danger)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {connected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
           style={{ background: 'var(--bg-primary)' }}>
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">💬</div>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Start the conversation!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.system) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs px-3 py-1 rounded-full"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  {msg.content}
                </span>
              </div>
            );
          }

          const isMe = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!isMe && (
                  <p className="text-xs mb-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                    {msg.sender_name}
                  </p>
                )}
                <div className="px-4 py-2.5 rounded-2xl text-sm"
                     style={{
                       background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                       color: isMe ? 'var(--bg-primary)' : 'var(--text-primary)',
                       borderBottomRightRadius: isMe ? '4px' : '16px',
                       borderBottomLeftRadius: isMe ? '16px' : '4px',
                     }}>
                  {msg.content}
                </div>
                <p className={`text-xs mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}
                   style={{ color: 'var(--text-muted)' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 max-w-5xl mx-auto">
          <input
            type="text"
            className="input flex-1"
            placeholder="Type a message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMsg.trim() || !connected}
            className="btn btn-primary px-6"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
