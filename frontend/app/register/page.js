'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register', form);
      await api.post('/auth/login', { email: form.email, password: form.password });
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-20%', right: '-15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo.png" alt="CONNECT Logo" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'JetBrains Mono', letterSpacing: '0.06em', marginTop: 4 }}>ENGINEERING PORTAL // REGISTER</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 36, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--cyan),var(--purple),transparent)' }} />

          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Join the CONNECT engineering network</p>

          {error && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Full Name</label>
              <input className="input" type="text" placeholder="Dr. Jane Smith" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Email Address</label>
              <input className="input" type="email" placeholder="engineer@connect.dev" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Institution (Optional)</label>
              <input className="input" type="text" placeholder="MIT, Stanford, IIT..." value={form.institution}
                onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spinner" /> : <span className="material-symbols-outlined">person_add</span>}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="dot dot-green" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>SYSTEMS ONLINE</span>
        </div>
      </div>
    </div>
  );
}
