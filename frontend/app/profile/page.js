'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

/* ── Core Alignment donut ── */
function AlignmentRing({ value = 94, size = 140 }) {
  const r = 54, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? 'var(--cyan)' : value >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 26, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>/ 100</span>
      </div>
    </div>
  );
}

const SKILL_CATEGORIES = {
  'Languages': ['Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'C++', 'Java', 'SQL', 'Julia', 'Kotlin'],
  'Frontend':  ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'TailwindCSS', 'Three.js'],
  'Backend':   ['Node.js', 'Express', 'FastAPI', 'Django', 'Spring Boot', 'NestJS', 'GraphQL'],
  'AI / ML':   ['TensorFlow', 'PyTorch', 'Scikit-learn', 'LangChain', 'OpenCV', 'Pandas', 'Transformers'],
  'Cloud / Infra': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Redis'],
};
const ALL_SKILLS = Object.values(SKILL_CATEGORIES).flat();

const LEVEL_COLORS = { expert: 'var(--cyan)', advanced: '#a78bfa', intermediate: 'var(--amber)', beginner: 'var(--text-muted)' };
const LEVEL_BADGES = { expert: 'badge-cyan', advanced: 'badge-purple', intermediate: 'badge-amber', beginner: '' };

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile]       = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [myApps, setMyApps]         = useState([]);
  const [allSkills, setAllSkills]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [form, setForm] = useState({ full_name: '', institution: '', bio: '', github: '', location: '' });
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('overview');

  // Redirect unauthenticated users once Firebase has resolved
  useEffect(() => {
    if (!authLoading && !authUser) router.push('/login');
  }, [authLoading, authUser]);

  useEffect(() => {
    if (authLoading || !authUser) return; // wait for Firebase session
    async function load() {
      try {
        const [prof, skills, proj, apps] = await Promise.all([
          api.get('/users/profile'),
          api.get('/skills'),
          api.get('/projects'),
          api.get('/applications/mine'),
        ]);
        const p = prof.data.profile;
        setProfile(p);
        // Fix: use full_name and github_url — actual DB column names
        setForm({ full_name: p.full_name || '', institution: p.institution || '', bio: p.bio || '', github: p.github_url || '', location: p.location || '' });
        setAllSkills(skills.data.skills || []);
        setMyProjects((proj.data.projects || []).filter(pr => pr.owner_id === p.id || pr.is_owner));
        setMyApps(apps.data.applications || []);
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    }
    load();
  }, [authLoading, authUser]);

  const telemetry = [
    ...myApps.slice(0, 8).map(a => ({
      icon: a.status === 'accepted' ? 'check_circle' : a.status === 'rejected' ? 'cancel' : 'pending',
      color: a.status === 'accepted' ? 'var(--green)' : a.status === 'rejected' ? 'var(--red)' : 'var(--amber)',
      date: new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      msg: `Applied to "${a.project_title || 'Project'}" — ${a.status}`,
    })),
  ];

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try { await api.put('/users/profile', form); setSaved(true); setTimeout(() => setSaved(false), 2500); } catch {}
    finally { setSaving(false); }
  }

  async function removeSkill(skillId) {
    try {
      await api.delete(`/skills/${skillId}`);
      setProfile(p => ({ ...p, skills: p.skills.filter(s => s.id !== skillId) }));
    } catch {}
  }

  async function addSkill(name) {
    setAddingSkill(true);
    try {
      const exist = allSkills.find(s => s.name === name);
      const res = await api.post('/skills/assign', { skills: [{ name, level: 'intermediate', skill_id: exist?.id }] });
      setProfile(p => ({ ...p, skills: [...(p.skills || []), res.data.assigned?.[0]].filter(Boolean) }));
    } catch {}
    finally { setAddingSkill(false); }
  }

  if (loading || !profile) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    </AppLayout>
  );

  // Fix: use full_name — actual DB column name (was profile.name which is always undefined)
  const alignmentScore = Math.min(100, 40 + (profile.skills?.length || 0) * 8);
  const initials = (profile.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const mySkills = profile.skills || [];
  const filteredAvailable = ALL_SKILLS.filter(s =>
    !mySkills.find(ms => ms.name === s) &&
    s.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const stats = [
    { label: 'Active Projects', value: myProjects.length, icon: 'account_tree', color: 'var(--cyan)' },
    { label: 'Applications',    value: myApps.length,     icon: 'send',         color: '#a78bfa' },
    { label: 'Skills',          value: mySkills.length,   icon: 'psychology',   color: 'var(--green)' },
    { label: 'Alignment Score', value: `${alignmentScore}`, icon: 'radar',      color: 'var(--amber)' },
  ];

  return (
    <AppLayout>
      <div className="page-content fade-in">

        {/* ── Profile Hero Card ── */}
        <div className="card" style={{ marginBottom: 20, padding: 0, position: 'relative', overflow: 'hidden' }}>
          <div className="card-accent-top card-accent-top-purple" />
          {/* Banner gradient */}
          <div style={{ height: 90, background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(0,128,255,0.2) 50%, rgba(0,212,255,0.1) 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.08) 0%, transparent 60%)' }} />
          </div>
          <div style={{ padding: '0 28px 24px', marginTop: -40 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 16 }}>
              {/* Avatar */}
              <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, var(--purple), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-base)', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 26 }}>{initials}</span>
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk' }}>{profile.full_name}</h1>
                  <span className="badge badge-cyan" style={{ fontSize: 9 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>
                    VERIFIED
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{profile.institution || 'Independent Engineer'}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                  {profile.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mail</span>
                      {profile.email}
                    </div>
                  )}
                  {form.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                      {form.location}
                    </div>
                  )}
                  {form.github && (
                    <a href={`https://github.com/${form.github}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span>
                      github.com/{form.github}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {stats.map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          {[
            { id: 'overview',   icon: 'person',      label: 'Overview' },
            { id: 'skills',     icon: 'psychology',  label: 'Technical Arsenal' },
            { id: 'projects',   icon: 'account_tree',label: 'Key Initiatives' },
            { id: 'settings',   icon: 'settings',    label: 'Settings' },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
            <div>
              {/* Bio */}
              {profile.bio && (
                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                  <div className="section-title" style={{ marginBottom: 10 }}>About</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{profile.bio}</p>
                </div>
              )}
              {/* Skill summary */}
              <div className="card" style={{ padding: 20 }}>
                <div className="section-header">
                  <span className="section-title">Technical Arsenal</span>
                  <button onClick={() => setTab('skills')} style={{ fontSize: 11, color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Manage <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mySkills.slice(0, 16).map(s => (
                    <span key={s.id} className={`badge ${LEVEL_BADGES[s.level] || ''}`} style={{ fontSize: 10 }}>
                      {s.name}
                      {s.level === 'expert' && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>star</span>}
                    </span>
                  ))}
                  {mySkills.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills added yet. <button onClick={() => setTab('skills')} style={{ color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Add skills →</button></p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Core Alignment + Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card ai-panel" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 16 }}>radar</span>
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)' }}>Core Alignment</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <AlignmentRing value={alignmentScore} size={130} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {alignmentScore >= 80
                    ? 'High compatibility with CONNECT AI heuristic models.'
                    : alignmentScore >= 60
                    ? 'Good alignment. Add more expert-level skills to improve.'
                    : 'Add skills to your profile to increase your alignment score.'}
                </p>
              </div>

              {/* Telemetry log */}
              <div className="card" style={{ padding: '0 0 4px' }}>
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="section-title">Telemetry Log</span>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {telemetry.length === 0 ? (
                    <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 12 }}>No activity recorded yet.</p>
                  ) : telemetry.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span className="material-symbols-outlined" style={{ color: t.color, fontSize: 15, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.msg}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{t.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Technical Arsenal (skills) tab ── */}
        {tab === 'skills' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Current skills */}
            <div>
              <div className="section-header" style={{ marginBottom: 14 }}>
                <span className="section-title">My Skills ({mySkills.length})</span>
              </div>
              {Object.entries(SKILL_CATEGORIES).map(([cat, catSkills]) => {
                const owned = mySkills.filter(s => catSkills.includes(s.name));
                if (!owned.length) return null;
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {owned.map(s => (
                        <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 10px', background: 'var(--bg-overlay)', border: `1px solid ${LEVEL_COLORS[s.level] || 'var(--border)'}20`, borderRadius: 20 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_COLORS[s.level] || 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
                          <span style={{ fontSize: 9, color: LEVEL_COLORS[s.level] || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.level}</span>
                          <button onClick={() => removeSkill(s.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', lineHeight: 1, transition: 'var(--transition)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {mySkills.length === 0 && (
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>psychology</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills yet. Add from the panel on the right.</p>
                </div>
              )}
            </div>

            {/* Add skills */}
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Add Skills</div>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-muted)', pointerEvents: 'none' }}>search</span>
                <input className="input" placeholder="Filter skills..." value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)} style={{ paddingLeft: 36 }} />
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredAvailable.slice(0, 40).map(s => (
                  <button key={s} disabled={addingSkill}
                    onClick={() => addSkill(s)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer', transition: 'var(--transition)', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 15 }}>add_circle</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Key Initiatives tab ── */}
        {tab === 'projects' && (
          <div>
            {myProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--text-muted)', display: 'block', marginBottom: 14 }}>rocket_launch</span>
                <h3 style={{ marginBottom: 8, fontSize: 16 }}>No Projects Created Yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>Start a project to see it as a Key Initiative.</p>
                <a href="/projects/new" className="btn btn-primary">
                  <span className="material-symbols-outlined">add</span>
                  Create Project
                </a>
              </div>
            ) : (
              <div className="grid-3" style={{ gap: 14 }}>
                {myProjects.map(p => (
                  <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card card-glow" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: 1, marginRight: 10 }}>{p.title}</h3>
                        <span className={`badge badge-${p.status === 'recruiting' ? 'green' : p.status === 'active' ? 'cyan' : 'amber'}`}>{p.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{p.description?.slice(0, 100)}{p.description?.length > 100 ? '...' : ''}</p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {p.skills?.slice(0, 3).map(s => <span key={s.id} className="skill-tag">{s.name}</span>)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings tab ── */}
        {tab === 'settings' && (
          <div style={{ maxWidth: 680 }}>
            <form onSubmit={handleSave}>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-title" style={{ marginBottom: 18 }}>Personal Information</div>
                <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="input-label">Full Name</label>
                    <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Jane Smith" />
                  </div>
                  <div>
                    <label className="input-label">Institution</label>
                    <input className="input" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="MIT, IIT, Stanford..." />
                  </div>
                  <div>
                    <label className="input-label">Location</label>
                    <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="San Francisco, CA" />
                  </div>
                  <div>
                    <label className="input-label">GitHub Username</label>
                    <input className="input" value={form.github} onChange={e => setForm(f => ({ ...f, github: e.target.value }))} placeholder="username" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Bio</label>
                  <textarea className="input" rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell other engineers about yourself..." style={{ resize: 'vertical' }} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center', padding: '11px 32px' }}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <span className="material-symbols-outlined">save</span>}
                {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
