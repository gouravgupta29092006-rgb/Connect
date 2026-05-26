'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/login', form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* bg blobs */}
      <div style={{ position: 'fixed', top: '-30%', left: '-20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,128,255,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo.png" alt="CONNECT Logo" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'JetBrains Mono', letterSpacing: '0.06em', marginTop: 4 }}>ENGINEERING PORTAL // AUTH</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 36, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--cyan),var(--blue),transparent)' }} />

          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Sign in to your engineering workspace</p>

          {error && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="input-label">Email Address</label>
              <input className="input" type="email" placeholder="engineer@connect.dev" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="••••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spinner" /> : <span className="material-symbols-outlined">login</span>}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link href="/register" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>Create one free</Link>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="dot dot-green" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>SYSTEMS ONLINE</span>
        </div>
      </div>
    </div>
  );
}
