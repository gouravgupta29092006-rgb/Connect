'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', institution: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slideUp">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Join CONNECT and find your team</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,77,106,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              value={form.full_name}
              onChange={update('full_name')}
              className="input"
              placeholder="Gourav Gupta"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={update('email')}
              className="input"
              placeholder="you@university.edu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={update('password')}
              className="input"
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Institution <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              id="register-institution"
              type="text"
              value={form.institution}
              onChange={update('institution')}
              className="input"
              placeholder="IIT Bombay, NIT Trichy, etc."
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }} />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
