'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const navLinks = [
  { href: '/dashboard',  label: 'Dashboard'  },
  { href: '/projects',   label: 'Projects'   },
  { href: '/ai-advisor', label: 'AI Advisor' },
  { href: '/notifications', label: 'Resources' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]       = useState(null);
  const [unread, setUnread]   = useState(0);
  const [search, setSearch]   = useState('');
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
    api.get('/notifications').then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
  }, []);

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleSearch(e) {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/projects?search=${encodeURIComponent(search.trim())}`);
    }
  }

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
        <Link href="/notifications" className="navbar-icon-btn" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined">notifications</span>
          {unread > 0 && <span className="navbar-notif-dot">{unread}</span>}
        </Link>
        <Link href="/profile" className="navbar-icon-btn">
          <span className="material-symbols-outlined">settings</span>
        </Link>
        <Link href="/profile" className="navbar-avatar">
          <span>{(user?.name || user?.email || 'U')[0].toUpperCase()}</span>
        </Link>
      </div>
    </header>
  );
}
