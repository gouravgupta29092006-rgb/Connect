'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
           style={{
             backgroundImage: 'linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)',
             backgroundSize: '60px 60px',
           }} />

      {/* Glow orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
           style={{ background: 'var(--accent)' }} />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
           style={{ background: 'var(--info)' }} />

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 pt-20 pb-32 text-center">
        <div className="animate-slideUp">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm"
               style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,255,198,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            AI-Powered Team Matching
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Find Your Perfect
            <br />
            <span className="gradient-text">Project Team</span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
            CONNECT uses AI to match engineering students with the right teammates
            based on skills, experience, and project needs. Stop searching. Start building.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="btn btn-primary text-base px-8 py-3 glow-accent animate-pulse-glow">
              Get Started Free →
            </Link>
            <Link href="/login" className="btn btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-20 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          {[
            { value: 'AI', label: 'Matchmaking' },
            { value: 'Real-time', label: 'Team Chat' },
            { value: 'Smart', label: 'Roadmaps' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need to <span className="gradient-text">Build Together</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🤖',
              title: 'AI Matchmaking',
              desc: 'Our scoring algorithm ranks candidates 0–100% based on skill alignment, then Gemini explains why they fit.',
            },
            {
              icon: '💬',
              title: 'Real-time Chat',
              desc: 'Socket.io-powered project rooms. Message your team instantly with persistent chat history.',
            },
            {
              icon: '📋',
              title: 'Smart Roadmaps',
              desc: 'AI generates structured project roadmaps with phases, tasks, milestones, and risk analysis.',
            },
            {
              icon: '🎯',
              title: 'Skill Profiles',
              desc: 'Rate your skills 1–5 across categories. Projects specify what they need. The AI connects the dots.',
            },
            {
              icon: '📩',
              title: 'Apply & Track',
              desc: 'One-click applications with real-time notifications. Accept, reject, and manage your team.',
            },
            {
              icon: '🛠',
              title: 'Debug Advisor',
              desc: 'Stuck on a bug? Ask the AI advisor for root cause analysis and step-by-step fixes.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card group hover:glow-accent">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-4xl mx-auto px-4 pb-24 text-center">
        <div className="card glow-accent p-10">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Team?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Join CONNECT and let AI do the matchmaking. Your next project starts here.
          </p>
          <Link href="/register" className="btn btn-primary text-base px-8 py-3">
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        Built with ❤️ by CONNECT — AI-Powered Teammate Matching
      </footer>
    </div>
  );
}
