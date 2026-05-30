'use client';
// components/Navbar.js
// App navbar — uses Firebase AuthContext for user state, Google avatar, and sign-out.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

const navLinks = [
  { href: '/dashboard',     label: 'Dashboard'  },
  { href: '/projects',      label: 'Projects'   },
  { href: '/ai-advisor',    label: 'AI Advisor' },
  { href: '/notifications', label: 'Resources'  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, fbUser, logout } = useAuth();

  const [unread, setUnread]           = useState(0);
  const [search, setSearch]           = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);

  useEffect(() => {
    api.get('/notifications').then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handler = () => setShowDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showDropdown]);

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleSearch(e) {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/projects?search=${encodeURIComponent(search.trim())}`);
    }
  }

  async function handleLogout(e) {
    e.stopPropagation();
    setLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setLoggingOut(false);
      setShowDropdown(false);
    }
  }

  // Prefer Google photo URL from Firebase, fallback to DB avatar_url, then initials
  const photoURL    = !avatarError && (fbUser?.photoURL || user?.avatar_url);
  const displayName = user?.full_name || fbUser?.displayName || user?.email || 'U';
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const isGoogle    = fbUser?.providerData?.[0]?.providerId === 'google.com';

  return (
    <header className="app-navbar">
      {/* Brand */}
      <Link href="/dashboard" className="navbar-brand" style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/logo.png" alt="CONNECT" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />
      </Link>

      {/* Nav links */}
      <nav className="navbar-links">
        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`navbar-link ${isActive(href) ? 'navbar-link-active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Search */}
      <div className={`navbar-search ${searchFocus ? 'navbar-search-focused' : ''}`}>
        <span className="material-symbols-outlined navbar-search-icon">search</span>
        <input
          type="text"
          placeholder="Search projects, engineers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          className="navbar-search-input"
        />
        {search && (
          <button onClick={() => setSearch('')} className="navbar-search-clear">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      {/* Right actions */}
      <div className="navbar-actions">
        {/* Notifications bell */}
        <Link href="/notifications" className="navbar-icon-btn" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined">notifications</span>
          {unread > 0 && <span className="navbar-notif-dot">{unread}</span>}
        </Link>

        {/* Settings */}
        <Link href="/profile" className="navbar-icon-btn">
          <span className="material-symbols-outlined">settings</span>
        </Link>

        {/* Avatar + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            id="navbar-avatar-btn"
            onClick={e => { e.stopPropagation(); setShowDropdown(v => !v); }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: isGoogle ? '2px solid #4285F4' : '2px solid var(--border)',
              overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-overlay)',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.2s',
            }}
            title={displayName}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                width={34} height={34}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                onError={() => setAvatarError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--cyan)',
                fontFamily: 'Space Grotesk', lineHeight: 1,
              }}>
                {initials}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 500,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 8, minWidth: 220,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)',
            }}>
              {/* User info */}
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: isGoogle ? '2px solid #4285F4' : '2px solid var(--border)',
                    background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {photoURL ? (
                      <img src={photoURL} alt="" width={36} height={36}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        referrerPolicy="no-referrer" onError={() => setAvatarError(true)} />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'Space Grotesk' }}>{initials}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email || fbUser?.email}
                    </div>
                    {isGoogle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <svg width="10" height="10" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                        <span style={{ fontSize: 10, color: '#4285F4', fontFamily: 'JetBrains Mono' }}>Google Account</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding: '4px 0' }}>
                <Link href="/profile" onClick={() => setShowDropdown(false)} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
                    Edit Profile
                  </div>
                </Link>
                <Link href="/dashboard" onClick={() => setShowDropdown(false)} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dashboard</span>
                    Dashboard
                  </div>
                </Link>
              </div>

              {/* Sign out */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 0 0' }}>
                <button onClick={handleLogout} disabled={loggingOut} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: 'transparent',
                  border: 'none', color: 'var(--red)', fontSize: 13, transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,71,87,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {loggingOut
                    ? <span className="spinner" style={{ width: 14, height: 14 }} />
                    : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>}
                  {loggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
