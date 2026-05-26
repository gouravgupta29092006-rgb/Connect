'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const navItems = [
  { href: '/dashboard',     icon: 'grid_view',        label: 'Dashboard'     },
  { href: '/projects',      icon: 'account_tree',     label: 'Projects'      },
  { href: '/ai-advisor',    icon: 'psychology',       label: 'AI Advisor'    },
  { href: '/notifications', icon: 'notifications',    label: 'Notifications' },
  { href: '/profile',       icon: 'person',           label: 'Profile'       },
];

const bottomItems = [
  { href: '/profile', icon: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]     = useState(null);
  const [unread, setUnread] = useState(0);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
    api.get('/notifications').then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
  }, []);

  async function handleLogout() {
    try { await api.get('/auth/logout'); } catch {}
    router.push('/login');
  }

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="app-sidebar">
      {/* Logo mark */}
      <div className="sidebar-logo">
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div className="sidebar-logo-mark" style={{ overflow: 'hidden', position: 'relative', background: 'transparent' }}>
            <img src="/logo.png" alt="C" style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 'auto', maxWidth: 'none' }} />
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {navItems.map(({ href, icon, label }) => {
          const active = isActive(href);
          return (
            <div key={href} className="sidebar-item-wrap"
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
            >
              <Link href={href} style={{ textDecoration: 'none' }}>
                <div className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}>
                  <span className="material-symbols-outlined">{icon}</span>
                  {label === 'Notifications' && unread > 0 && (
                    <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
                  )}
                </div>
              </Link>
              {tooltip === label && (
                <div className="sidebar-tooltip">{label}</div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Bottom: avatar + logout */}
      <div className="sidebar-bottom">
        <div className="sidebar-item-wrap"
          onMouseEnter={() => setTooltip('Sign Out')}
          onMouseLeave={() => setTooltip(null)}
        >
          <button onClick={handleLogout} className="sidebar-item sidebar-logout">
            <span className="material-symbols-outlined">logout</span>
          </button>
          {tooltip === 'Sign Out' && (
            <div className="sidebar-tooltip">Sign Out</div>
          )}
        </div>

        <div className="sidebar-item-wrap"
          onMouseEnter={() => setTooltip(user?.name || 'Profile')}
          onMouseLeave={() => setTooltip(null)}
        >
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div className="sidebar-avatar">
              <span>{(user?.name || user?.email || 'U')[0].toUpperCase()}</span>
              <span className="sidebar-avatar-dot" />
            </div>
          </Link>
          {tooltip === (user?.name || 'Profile') && (
            <div className="sidebar-tooltip">{user?.name || 'Profile'}</div>
          )}
        </div>
      </div>
    </aside>
  );
}
