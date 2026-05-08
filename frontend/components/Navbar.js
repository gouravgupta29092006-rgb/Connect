'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { getNotifications } from '@/lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then(({ data }) => setUnread(data.unread_count || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      getNotifications()
        .then(({ data }) => setUnread(data.unread_count || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '◆' },
    { href: '/projects', label: 'Projects', icon: '◈' },
    { href: '/profile', label: 'Profile', icon: '◉' },
    { href: '/ai-advisor', label: 'AI Advisor', icon: '✦' },
  ];

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="glass sticky top-0 z-50" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                 style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
              C
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">CONNECT</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)',
                    background: isActive(link.href) ? 'var(--accent-dim)' : 'transparent',
                  }}
                >
                  <span className="mr-1.5">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg transition-colors"
                  style={{
                    color: pathname === '/notifications' ? 'var(--accent)' : 'var(--text-secondary)',
                    background: pathname === '/notifications' ? 'var(--accent-dim)' : 'transparent',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                          style={{ background: 'var(--danger)', color: 'white', fontSize: '0.65rem' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {/* User menu */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                       style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button onClick={handleLogout} className="btn-secondary btn text-xs py-1.5 px-3">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn btn-secondary text-sm">Sign in</Link>
                <Link href="/register" className="btn btn-primary text-sm">Get Started</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button
                className="md:hidden p-2"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {user && mobileOpen && (
          <div className="md:hidden pb-4 animate-fadeIn">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium mt-1"
                style={{
                  color: isActive(link.href) ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive(link.href) ? 'var(--accent-dim)' : 'transparent',
                }}
              >
                <span className="mr-2">{link.icon}</span>{link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
