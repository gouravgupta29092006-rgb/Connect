'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

/* ── Mini area chart (SVG) ── */
function AreaChart({ data = [], color = '#00d4ff', height = 80 }) {
  if (!data.length) return null;
  const w = 400, h = height;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 8);
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(' L')}`;
  const areaD = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#area-grad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
    </svg>
  );
}

/* ── Donut gauge ── */
function DonutGauge({ value = 92, size = 120, color = '#00d4ff', label = '' }) {
  const r = 45, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: size * 0.2, color, lineHeight: 1 }}>{value}%</span>
        {label && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>}
      </div>
    </div>
  );
}

/* ── Sprint card with progress bar ── */
function SprintCard({ project }) {
  const progress = project.progress ?? Math.floor(Math.random() * 60 + 20);
  const colorClass = progress >= 70 ? 'progress-bar-fill-green' : progress >= 40 ? '' : 'progress-bar-fill-amber';
  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-glow" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {project.owner_name || 'You'} • {project.skills?.length || 0} skills
            </div>
          </div>
          <span className={`badge badge-${project.status === 'recruiting' ? 'green' : project.status === 'active' ? 'cyan' : 'amber'}`}>
            SPRINT #{String(project.id).slice(-2).replace(/\D/g, '') || '01'}
          </span>
        </div>
        <div className="progress-bar-wrap">
          <div className={`progress-bar-fill ${colorClass}`} style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {project.status?.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>{progress}%</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Log level badge ── */
function LogLevel({ type }) {
  const map = {
    INFO:   'log-level-info',
    DEPLOY: 'log-level-deploy',
    WARN:   'log-level-warn',
    AUTH:   'log-level-auth',
    ERROR:  'log-level-error',
  };
  return <span className={`log-level ${map[type] || 'log-level-info'}`}>{type}</span>;
}

/* ── Throughput data (simulated wave) ── */
function makeThroughputData() {
  return Array.from({ length: 20 }, (_, i) =>
    3 + Math.sin(i * 0.6) * 1.2 + Math.random() * 0.5
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [notifs, setNotifs]     = useState([]);
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [throughput]            = useState(makeThroughputData);
  const [aiScore]               = useState(92);

  // Redirect unauthenticated users once Firebase has resolved session
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return; // wait for auth before fetching
    async function load() {
      try {
        const [proj, n, a] = await Promise.all([
          api.get('/projects'),
          api.get('/notifications'),
          api.get('/applications/mine'),
        ]);
        setProjects(proj.data.projects || []);
        setNotifs(n.data.notifications || []);
        setApps(a.data.applications || []);
      } catch { /* silently fail — auth redirect handled above */ }
      finally { setLoading(false); }
    }
    load();
  }, [authLoading, user]);

  const stats = [
    { icon: 'account_tree', label: 'Active Sprints',  value: projects.length,                          color: 'var(--cyan)',   trend: '+2 this week', href: '/projects' },
    { icon: 'send',         label: 'Applications',    value: apps.length,                              color: '#a78bfa',      trend: 'All time',     href: '/projects' },
    { icon: 'notifications',label: 'Unread Events',   value: notifs.filter(n => !n.is_read).length,   color: 'var(--amber)', trend: 'Requires action', href: '/notifications' },
    { icon: 'psychology',   label: 'AI Match Score',  value: `${aiScore}%`,                           color: 'var(--green)', trend: 'System optimal', href: '/ai-advisor' },
  ];

  /* Build system logs from notifications */
  const logTypes = ['INFO', 'DEPLOY', 'WARN', 'AUTH', 'INFO'];
  const systemLogs = notifs.slice(0, 6).map((n, i) => ({
    id: n.id,
    time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: logTypes[i % logTypes.length],
    msg: n.message,
    read: n.is_read,
  }));
  /* Pad with static logs if empty */
  const defaultLogs = [
    { id: 'l1', time: '10:42:01', type: 'INFO',   msg: 'Neural cluster alpha synced successfully.' },
    { id: 'l2', time: '10:40:15', type: 'DEPLOY', msg: 'CI/CD pipeline completed on main branch.' },
    { id: 'l3', time: '10:35:22', type: 'WARN',   msg: 'High latency detected in US-EAST region.' },
    { id: 'l4', time: '10:30:00', type: 'INFO',   msg: 'Database backup task completed HDFS.' },
    { id: 'l5', time: '10:05:44', type: 'AUTH',   msg: 'Access session granted to localhost.' },
  ];
  const logs = systemLogs.length ? systemLogs : defaultLogs;

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: '0.1em' }}>INITIALIZING SYSTEMS...</p>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="page-content fade-in">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <div className="page-eyebrow">
                <span className="dot dot-green dot-pulse" />
                <span className="page-eyebrow-text">System V3.4.0 Active • All nodes operational</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700 }}>
                Welcome Back, <span className="text-glow">{user?.full_name?.split(' ')[0] || 'Engineer'}</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
                {user?.institution ? `${user.institution} • ` : ''}Your command center is active.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/projects/new" className="btn btn-primary">
                <span className="material-symbols-outlined">add</span>
                New Project
              </Link>
              <Link href="/ai-advisor" className="btn btn-ghost">
                <span className="material-symbols-outlined">psychology</span>
                AI Advisor
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {stats.map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}>LIVE</span>
                </div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-trend" style={{ color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>trending_up</span>
                  {s.trend}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* ─── Left Column ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Network Throughput Chart */}
            <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div className="card-accent-top" />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div className="section-title" style={{ marginBottom: 6 }}>Network Throughput</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: 700, color: 'var(--cyan)' }}>
                      {(3 + Math.random() * 2).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>TB/s</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['US-EAST', 'EU-WEST'].map((r, i) => (
                    <span key={r} style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono', fontWeight: 600,
                      background: i === 0 ? 'var(--cyan-dim)' : 'rgba(255,255,255,0.04)',
                      color: i === 0 ? 'var(--cyan)' : 'var(--text-muted)',
                      border: `1px solid ${i === 0 ? 'rgba(0,212,255,0.25)' : 'var(--border)'}`,
                    }}>{r}</span>
                  ))}
                </div>
              </div>
              <AreaChart data={throughput} color="#00d4ff" height={80} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {['0:00','6:00','12:00','18:00','24:00'].map(t => (
                  <span key={t} className="chart-label">{t}</span>
                ))}
              </div>
            </div>

            {/* Active Sprints */}
            <div>
              <div className="section-header">
                <span className="section-title">Active Sprints</span>
                <Link href="/projects" style={{ color: 'var(--cyan)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.slice(0, 4).length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>rocket_launch</span>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>No projects yet. Launch your first sprint.</p>
                    <Link href="/projects/new" className="btn btn-outline" style={{ display: 'inline-flex' }}>
                      <span className="material-symbols-outlined">add</span>
                      Create Project
                    </Link>
                  </div>
                ) : projects.slice(0, 4).map(p => <SprintCard key={p.id} project={p} />)}
              </div>
            </div>
          </div>

          {/* ─── Right Column ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* AI Optimizer Donut */}
            <div className="card ai-panel" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: 18 }}>auto_awesome</span>
                <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a78bfa' }}>AI Optimizer</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <DonutGauge value={aiScore} size={110} color="#a78bfa" label="efficiency" />
              </div>
              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recommendation</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {apps.length > 0
                    ? `You have ${apps.length} active application${apps.length > 1 ? 's' : ''}. Check project status to improve match rate.`
                    : 'Update your skill profile to unlock AI-powered project recommendations and improve match scores.'}
                </p>
              </div>
              <Link href="/ai-advisor" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(124,58,237,0.4)', color: '#a78bfa', fontSize: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>rocket_launch</span>
                Launch AI Lab
              </Link>
            </div>

            {/* System Logs */}
            <div className="card" style={{ padding: '4px 0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="section-title">System Logs</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="dot dot-green dot-pulse" style={{ width: 6, height: 6 }} />
                  <span style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'JetBrains Mono', letterSpacing: '0.06em' }}>LIVE</span>
                </div>
              </div>
              <div style={{ padding: '4px 16px 8px' }}>
                {logs.map(l => (
                  <div key={l.id} className="log-item">
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 52 }}>{l.time}</span>
                    <LogLevel type={l.type} />
                    <span style={{ fontSize: 11, color: l.read === false ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="section-header"><span className="section-title">Quick Actions</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { href: '/projects',   icon: 'search',    label: 'Browse Projects',       color: 'var(--cyan)' },
                  { href: '/profile',    icon: 'tune',      label: 'Update Skills',          color: '#a78bfa' },
                  { href: '/ai-advisor', icon: 'psychology',label: 'AI Roadmap Generator',  color: 'var(--green)' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                    <div className="card card-glow" style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: a.color, fontSize: 16 }}>{a.icon}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{a.label}</span>
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 16 }}>chevron_right</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
