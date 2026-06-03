'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [allSkills, setAllSkills] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', status: 'recruiting' });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillLevel, setSkillLevel] = useState({});
  const [skillSearch, setSkillSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    api.get('/skills').then(r => setAllSkills(r.data.skills || [])).catch(() => {});
  }, []);

  function toggleSkill(s) {
    setSelectedSkills(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const skillsPayload = selectedSkills.map(s => ({ id: s.id, level: skillLevel[s.id] || 'beginner' }));
      const { data } = await api.post('/projects', { ...form, skills: skillsPayload });
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project.');
    } finally { setLoading(false); }
  }

  const filteredSkills = allSkills.filter(s =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.some(x => x.id === s.id)
  );

  return (
    <AppLayout>
      <div className="page-content fade-in">
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/projects" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none', transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 700 }}>
              Launch New <span className="text-glow">Project</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>Define your project and start recruiting team members.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
            {/* Left: main fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--cyan),var(--blue),transparent)' }} />
                <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Project Details</h2>

                {error && (
                  <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>{error}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="input-label">Project Title *</label>
                    <input className="input" placeholder="Neural Pipeline Optimizer" value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="input-label">Description *</label>
                    <textarea className="input" placeholder="Describe your project goals, tech stack, and what you're looking for in teammates..." rows={5}
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <label className="input-label">Status</label>
                    <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="recruiting">Recruiting — Open for applications</option>
                      <option value="active">Active — In progress</option>
                      <option value="completed">Completed — Project done</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Selected Skills Preview */}
              <div className="card" style={{ padding: 24 }}>
                <div className="section-header">
                  <span className="section-title">Selected Skills</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSkills.length} selected</span>
                </div>
                {selectedSkills.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills selected. Add from the panel →</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedSkills.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 20 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cyan)' }}>{s.name}</span>
                        <select value={skillLevel[s.id] || 'beginner'} onChange={e => setSkillLevel(l => ({ ...l, [s.id]: e.target.value }))}
                          style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          {['beginner','intermediate','expert'].map(l => <option key={l}>{l}</option>)}
                        </select>
                        <button type="button" onClick={() => toggleSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: skill picker + submit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="section-header"><span className="section-title">Required Skills</span></div>
                <input className="input" style={{ marginBottom: 12 }} placeholder="Search skills..." value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)} />
                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredSkills.slice(0, 40).map(s => (
                    <button type="button" key={s.id} onClick={() => toggleSkill(s)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', color: 'var(--text-primary)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan-dim)'; e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-overlay)'; }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-muted)' }}>add_circle</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                      {s.category && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.category}</span>}
                    </button>
                  ))}
                  {filteredSkills.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No skills match your search.</p>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }} disabled={loading}>
                {loading ? <><span className="spinner" /> Creating...</> : <><span className="material-symbols-outlined">rocket_launch</span>Launch Project</>}
              </button>
              <Link href="/projects" className="btn btn-ghost" style={{ justifyContent: 'center', padding: '12px' }}>
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
