'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

const features = [
  { icon: 'bolt', label: 'AI Team Matcher', desc: 'Intelligent pairing based on complementary skills, experience, and project needs.' },
  { icon: 'psychology', label: 'AI Project Advisor', desc: 'Real-time roadmaps, debug assistance, and structural recommendations.' },
  { icon: 'hub', label: 'Real-time Collab', desc: 'Live project boards, encrypted chat, and synchronized team workspaces.' },
  { icon: 'auto_awesome', label: 'Smart Matching', desc: 'SQL-ranked candidates scored 0–100% with AI-generated explanations.' },
];

const stats = [
  { value: '2.4K+', label: 'Engineers' },
  { value: '830+', label: 'Projects' },
  { value: '98%', label: 'Match Rate' },
  { value: '15ms', label: 'Latency' },
];

export default function LandingPage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.alpha})`;
        ctx.fill();
      });
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Background gradient blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,128,255,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 48px', borderBottom: '1px solid var(--border)', background: 'rgba(5,10,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="CONNECT Logo" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" className="btn btn-ghost" style={{ padding: '8px 20px' }}>Sign In</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: '8px 20px' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 48px 80px' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: 24, display: 'inline-flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bolt</span>
            AI-Powered Engineering Portal
          </div>

          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 'clamp(40px,7vw,80px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 24, maxWidth: 900, margin: '0 auto 24px' }}>
            The Future of<br />
            <span style={{ background: 'linear-gradient(135deg, var(--cyan), var(--blue), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Engineering Collaboration
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            AI-powered ecosystem connecting engineers, students, and innovators. 
            Find teammates, build projects, and ship faster — together.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 80 }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
              <span className="material-symbols-outlined">rocket_launch</span>
              Start Building Free
            </Link>
            <Link href="/login" className="btn btn-ghost" style={{ padding: '14px 32px', fontSize: 16 }}>
              <span className="material-symbols-outlined">login</span>
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 700, color: 'var(--cyan)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 10, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge badge-purple" style={{ marginBottom: 16, display: 'inline-flex' }}>Core Modules</div>
            <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }}>
              Powered by <span className="text-glow">Intelligence</span>
            </h2>
          </div>
          <div className="grid-2" style={{ gap: 24 }}>
            {features.map((f, i) => (
              <div key={f.label} className="card" style={{ padding: 32, animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 24 }}>{f.icon}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{f.label}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 10, padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '56px 48px' }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
            Ready to <span className="text-glow">CONNECT?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Join engineers building the next generation of technology.</p>
          <Link href="/register" className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16 }}>
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid var(--border)', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, color: 'var(--text-muted)', fontSize: 14 }}>
          © 2025 CONNECT AI Platform. Precision Engineering through Intelligence.
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Documentation', 'Privacy', 'Terms'].map(l => (
            <a key={l} href="#" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--cyan)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
