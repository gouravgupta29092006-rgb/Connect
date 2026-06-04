'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

const CATEGORIES = [
  { id: 'all',       icon: 'grid_view',        label: 'All Events'      },
  { id: 'unread',    icon: 'mark_email_unread', label: 'Unread'          },
  { id: 'apply',     icon: 'send',             label: 'Applications'    },
  { id: 'accept',    icon: 'check_circle',     label: 'Acceptances'     },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [marking, setMarking] = useState(null);

  // Redirect unauthenticated users once Firebase has resolved session
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  async function load() {
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data.notifications || []);
    } catch (err) {
      if (err.response?.status === 401) router.push('/login');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user]);

  async function markRead(id) {
    setMarking(id);
    try {
      // Fix: was '/api/notifications/...' which double-prefixes to /api/api/notifications
      await api.patch(`/notifications/${id}/read`);
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    } catch {} finally { setMarking(null); }
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.is_read);
    for (const n of unread) await markRead(n.id);
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'apply')  return n.message?.toLowerCase().includes('apply') || n.message?.toLowerCase().includes('application');
    if (filter === 'accept') return n.message?.toLowerCase().includes('accept');
    return true;
  });

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="page-content fade-in">
        {/* Header */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="dot dot-green" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>RESOURCE HUB // TELEMETRY FEED</span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 700 }}>
              System <span className="text-glow">Notifications</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
              Real-time activity feed — {unreadCount} unread event{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-outline" onClick={markAllRead}>
              <span className="material-symbols-outlined">done_all</span>
              Mark All Read
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          {/* Left sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Categories */}
            <div className="card" style={{ padding: '8px 0' }}>
              <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Categories</div>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFilter(c.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                  background: filter === c.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: 'none', borderLeft: `2px solid ${filter === c.id ? 'var(--cyan)' : 'transparent'}`,
                  color: filter === c.id ? 'var(--cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: filter === c.id ? 600 : 400, transition: 'var(--transition)', textAlign: 'left',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{c.icon}</span>
                  {c.label}
                  {c.id === 'unread' && unreadCount > 0 && (
                    <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick links */}
            <div className="card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Quick Links</div>
              {[
                { href: '/projects',   icon: 'account_tree', label: 'Browse Projects' },
                { href: '/profile',    icon: 'person',       label: 'Your Profile'    },
                { href: '/ai-advisor', icon: 'psychology',   label: 'AI Advisor'      },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 13, borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{l.icon}</span>
                  {l.label}
                </a>
              ))}
            </div>

            {/* Stats card */}
            <div style={{ background: 'linear-gradient(135deg,rgba(0,128,255,0.1),rgba(124,58,237,0.1))', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Activity Stats</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{notifs.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Unread</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{unreadCount}</span>
              </div>
            </div>
          </div>

          {/* Main feed */}
          <div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmer" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: 56, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>notifications_off</span>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, marginBottom: 8 }}>No Events</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notifications in this category yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((n, i) => (
                  <div key={n.id} className="card" style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                    borderLeft: !n.is_read ? '3px solid var(--cyan)' : '3px solid transparent',
                    animationDelay: `${i * 0.03}s`,
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.is_read ? 'var(--bg-overlay)' : 'rgba(0,212,255,0.12)', border: `1px solid ${n.is_read ? 'var(--border)' : 'var(--cyan-dim)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: n.is_read ? 'var(--text-muted)' : 'var(--cyan)' }}>
                        {n.message?.includes('accept') ? 'check_circle' : n.message?.includes('reject') ? 'cancel' : 'notifications'}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.5, marginBottom: 4 }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} disabled={marking === n.id} style={{
                        flexShrink: 0, background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '5px 12px', color: 'var(--text-muted)', fontSize: 12,
                        cursor: 'pointer', transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        {marking === n.id ? '...' : 'Mark read'}
                      </button>
                    )}
                    {n.is_read && <span className="badge badge-cyan" style={{ flexShrink: 0, fontSize: 10 }}>Read</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
