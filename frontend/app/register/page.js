'use client';
// app/register/page.js — Firebase-powered registration with Google OAuth + email/password

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithGoogle, registerWithEmail } = useAuth();

  const [form, setForm]           = useState({ full_name: '', email: '', password: '', institution: '' });
  const [confirmPass, setConfirm] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);

  // ─── Google Sign-Up (same flow as Sign-In — Firebase handles both) ─────────
  async function handleGoogle() {
    setError(''); setGoogleLoad(true);
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by your browser. Please allow popups for this site.');
      } else {
        setError(err.message || 'Google sign-up failed. Please try again.');
      }
    } finally { setGoogleLoad(false); }
  }

  // ─── Email / Password Registration ────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) return setError('Full name is required.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== confirmPass) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await registerWithEmail(form.email, form.password, form.full_name.trim(), form.institution.trim());
      router.push('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 8 characters with a mix of letters and numbers.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
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
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Join the CONNECT engineering network</p>

          {error && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          {/* Google Sign-Up — fastest path */}
          <GoogleSignInButton onClick={handleGoogle} loading={googleLoad} text="Sign up with Google" />

          {/* Free badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
              FREE — No credit card required
            </span>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>OR REGISTER WITH EMAIL</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Full Name</label>
              <input className="input" type="text" placeholder="Dr. Jane Smith" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Email Address</label>
              <input className="input" type="email" placeholder="engineer@connect.dev" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Institution <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
              <input className="input" type="text" placeholder="MIT, Stanford, IIT..." value={form.institution}
                onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="input-label">Confirm Password</label>
              <input className="input" type="password" placeholder="Re-enter password" value={confirmPass}
                onChange={e => setConfirm(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" id="email-register-btn"
              style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15, marginTop: 4 }}
              disabled={loading || googleLoad}>
              {loading ? <span className="spinner" /> : <span className="material-symbols-outlined">person_add</span>}
              {loading ? 'Creating Account...' : 'Create Free Account'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="dot dot-green" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>SYSTEMS ONLINE • 100% FREE TIER</span>
        </div>
      </div>
    </div>
  );
}
