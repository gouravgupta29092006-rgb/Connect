'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

const STATUS_OPTIONS = ['all', 'recruiting', 'active', 'completed'];
const DOMAINS = ['Artificial Intelligence', 'Robotics', 'Aerospace', 'Web / Cloud', 'Blockchain', 'Data Science'];
const SKILL_FILTERS = ['Python', 'React', 'Node.js', 'Rust', 'Go', 'TensorFlow', 'C++', 'SQL'];
const AVAILABILITY = ['Immediately Available', 'Within 1 week', 'Within 1 month'];

/* ── Match score bar ── */
function MatchScore({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--cyan)' : score >= 40 ? 'var(--amber)' : 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Space Grotesk', minWidth: 34 }}>{score}%</span>
    </div>
  );
}

/* ── Star rating ── */
function StarRating({ value = 4.5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: 12, color: i <= Math.floor(value) ? 'var(--amber)' : 'var(--text-muted)' }}>star</span>
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>{value}</span>
    </div>
  );
}

/* ── Engineer card ── */
function EngineerCard({ eng }) {
  const initials = (eng.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const score = eng.match_score || Math.floor(Math.random() * 30 + 65);
  const rating = (3.5 + Math.random() * 1.5).toFixed(1);
  return (
    <div className="card card-glow" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, var(--purple), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{eng.name || 'Engineer'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{eng.institution || 'Independent Engineer'}</div>
          <StarRating value={parseFloat(rating)} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--cyan)' : 'var(--amber)' }}>{score}%</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Match</div>
        </div>
      </div>
      <MatchScore score={score} />
      {eng.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {eng.skills.slice(0, 4).map(s => (
            <span key={s.id} className="skill-tag">{s.name}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
          View Profile
        </button>
        <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
          Connect
        </button>
      </div>
    </div>
  );
}

/* ── Project card ── */
function ProjectCard({ p, onApply, applying, applyMsg }) {
  return (
    <div className="card card-glow" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}
              onMouseEnter={e => e.target.style.color = 'var(--cyan)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-primary)'}>
              {p.title}
            </h3>
          </Link>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>by {p.owner_name || 'Unknown'}</p>
        </div>
        <span className={`badge badge-${p.status === 'recruiting' ? 'green' : p.status === 'active' ? 'cyan' : 'amber'}`}>
          {p.status === 'recruiting' ? 'Hiring' : p.status}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {p.description || 'No description provided.'}
      </p>

      {p.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {p.skills.slice(0, 3).map(s => <span key={s.id} className="skill-tag">{s.name}</span>)}
          {p.skills.length > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>+{p.skills.length - 3}</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <Link href={`/projects/${p.id}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: 11 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          Details
        </Link>
        {p.status === 'recruiting' && (
          <button onClick={() => onApply(p.id)} disabled={applying === p.id} className="btn btn-outline"
            style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: 11,
              background: applyMsg[p.id]?.type === 'success' ? 'var(--green-dim)' : undefined,
              borderColor: applyMsg[p.id]?.type === 'success' ? 'var(--green)' : undefined,
              color: applyMsg[p.id]?.type === 'error' ? 'var(--red)' : undefined,
            }}>
            {applying === p.id ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>}
            {applyMsg[p.id]?.text || 'Apply'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab]           = useState('projects');
  const [projects, setProjects] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState(searchParams.get('search') || '');
  const [status, setStatus]     = useState('all');
  const [applying, setApplying] = useState(null);
  const [applyMsg, setApplyMsg] = useState({});

  /* Filter state */
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedSkills, setSelectedSkills]   = useState([]);
  const [availability, setAvailability]       = useState('');

  // Redirect unauthenticated users once Firebase has resolved
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  function toggleFilter(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  async function loadProjects() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      const { data } = await api.get(`/projects?${params}`);
      setProjects(data.projects || []);
    } catch (err) {
      if (err.response?.status === 401) router.push('/login');
    } finally { setLoading(false); }
  }

  async function loadEngineers() {
    setLoading(true);
    try {
      /* Use AI match endpoint — try first project or fallback to profile */
      const { data } = await api.get('/users/profile');
      /* Build mock engineers from profile data for now */
      setEngineers([data.profile]);
    } catch { setEngineers([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (authLoading || !user) return; // wait for Firebase session
    if (tab === 'projects') loadProjects();
    else loadEngineers();
  }, [tab, status, authLoading, user]);

  async function handleApply(projectId) {
    setApplying(projectId);
    try {
      await api.post(`/projects/${projectId}/apply`);
      setApplyMsg(m => ({ ...m, [projectId]: { type: 'success', text: '✓ Applied' } }));
    } catch (err) {
      setApplyMsg(m => ({ ...m, [projectId]: { type: 'error', text: err.response?.data?.error || 'Failed' } }));
    } finally { setApplying(null); }
  }

  const tabCounts = { projects: projects.length, engineers: engineers.length };

  return (
    <AppLayout>
      <div className="page-content fade-in">
        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <div className="page-eyebrow">
                <span className="dot dot-cyan" />
                <span className="page-eyebrow-text">Discovery Engine V2.4 Active</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700 }}>
                Discover <span className="text-glow">Innovation</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
                Search across engineering projects and find your next collaboration.
              </p>
            </div>
            <Link href="/projects/new" className="btn btn-primary">
              <span className="material-symbols-outlined">add</span>
              New Project
            </Link>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)', fontSize: 18, pointerEvents: 'none' }}>search</span>
          <input className="input" style={{ paddingLeft: 44, paddingRight: 100, height: 46, fontSize: 14, borderColor: 'var(--border)', borderRadius: 12 }}
            placeholder={tab === 'projects' ? 'Search projects by title, tech stack, skills...' : 'Search engineers by name, skills, institution...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadProjects()}
          />
          <button className="btn btn-primary" onClick={() => tab === 'projects' ? loadProjects() : loadEngineers()}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '7px 18px', fontSize: 13 }}>
            Explore
          </button>
        </div>

        {/* ── AI hint ── */}
        <div className="ai-hint" style={{ marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: 16, flexShrink: 0, marginTop: 1 }}>auto_awesome</span>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: '#a78bfa' }}>AI Suggested:</strong> Based on your recent activity, consider exploring engineers with expertise in <span style={{ color: 'var(--cyan)' }}>Machine Learning</span> and <span style={{ color: 'var(--cyan)' }}>Distributed Systems</span>.
          </p>
        </div>

        {/* ── Main layout: filters + content ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>

          {/* ── Filters sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>▸ Filters</div>

              {/* Status (projects only) */}
              {tab === 'projects' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Status</div>
                  {STATUS_OPTIONS.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                      <div onClick={() => setStatus(s)} style={{
                        width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${status === s ? 'var(--cyan)' : 'var(--border)'}`,
                        background: status === s ? 'var(--cyan)' : 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'var(--transition)',
                      }}>
                        {status === s && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: status === s ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{s}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Domain */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Domain</div>
                {DOMAINS.slice(0, 5).map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                    <div onClick={() => toggleFilter(selectedDomains, setSelectedDomains, d)} style={{
                      width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selectedDomains.includes(d) ? 'var(--cyan)' : 'var(--border)'}`,
                      background: selectedDomains.includes(d) ? 'var(--cyan)' : 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'var(--transition)',
                    }}>
                      {selectedDomains.includes(d) && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: selectedDomains.includes(d) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{d}</span>
                  </label>
                ))}
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {SKILL_FILTERS.map(s => (
                    <button key={s} onClick={() => toggleFilter(selectedSkills, setSelectedSkills, s)}
                      className={`filter-pill ${selectedSkills.includes(s) ? 'filter-pill-active' : ''}`}
                      style={{ padding: '3px 8px', fontSize: 10 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability (engineers only) */}
              {tab === 'engineers' && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Availability</div>
                  {AVAILABILITY.map(a => (
                    <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                      <div onClick={() => setAvailability(availability === a ? '' : a)} style={{
                        width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${availability === a ? 'var(--cyan)' : 'var(--border)'}`,
                        background: availability === a ? 'var(--cyan)' : 'transparent', cursor: 'pointer', transition: 'var(--transition)', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, color: availability === a ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{a}</span>
                    </label>
                  ))}
                </div>
              )}

              <button onClick={() => { setSelectedDomains([]); setSelectedSkills([]); setStatus('all'); setAvailability(''); }}
                style={{ width: '100%', marginTop: 8, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                Reset Filters
              </button>
            </div>

            {/* AI recommendation */}
            <div className="ai-panel card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: 16 }}>auto_awesome</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Recommendation</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                Based on your recent project history, consider exploring engineers with expertise in Thermal Dynamics.
              </p>
              <Link href="/ai-advisor" className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px', color: '#a78bfa', borderColor: 'rgba(124,58,237,0.3)', width: '100%', justifyContent: 'center' }}>
                View Analysis
              </Link>
            </div>
          </div>

          {/* ── Content area ── */}
          <div>
            {/* Tab bar */}
            <div className="tab-bar" style={{ marginBottom: 20 }}>
              <button className={`tab-btn ${tab === 'projects' ? 'tab-btn-active' : ''}`} onClick={() => setTab('projects')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_tree</span>
                Projects
                <span className="badge badge-cyan" style={{ fontSize: 9, marginLeft: 2 }}>{tabCounts.projects}</span>
              </button>
              <button className={`tab-btn ${tab === 'engineers' ? 'tab-btn-active' : ''}`} onClick={() => setTab('engineers')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                Engineers
                <span className="badge badge-purple" style={{ fontSize: 9, marginLeft: 2 }}>{tabCounts.engineers}</span>
              </button>
            </div>

            {loading ? (
              <div className={tab === 'projects' ? 'grid-3' : 'grid-2'} style={{ gap: 14 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shimmer" style={{ height: tab === 'projects' ? 180 : 160, borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : tab === 'projects' ? (
              projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 14 }}>search_off</span>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>No Projects Found</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>Try adjusting your search or create the first project.</p>
                  <Link href="/projects/new" className="btn btn-primary">
                    <span className="material-symbols-outlined">add</span>
                    Create Project
                  </Link>
                </div>
              ) : (
                <div className="grid-3" style={{ gap: 14 }}>
                  {projects.map(p => <ProjectCard key={p.id} p={p} onApply={handleApply} applying={applying} applyMsg={applyMsg} />)}
                </div>
              )
            ) : (
              engineers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 14 }}>person_search</span>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>No Engineers Found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add skills to your profile to be discoverable.</p>
                </div>
              ) : (
                <div className="grid-2" style={{ gap: 14 }}>
                  {engineers.map((e, i) => e && <EngineerCard key={i} eng={e} />)}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
