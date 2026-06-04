'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function ProjectDetailPage() {
  const router   = useRouter();
  const { id }   = useParams();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject]   = useState(null);
  const [tab, setTab]           = useState('overview');
  const [applications, setApplications] = useState([]);
  const [aiMatch, setAiMatch]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [deciding, setDeciding] = useState(null);

  // Redirect unauthenticated users once Firebase has resolved
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    async function load() {
      try {
        // Fix: removed /api prefix — Axios client already adds /api
        const { data } = await api.get(`/projects/${id}`);
        setProject(data.project);
      } catch (err) {
        if (err.response?.status === 401) router.push('/login');
        else if (err.response?.status === 404) router.push('/projects');
      } finally { setLoading(false); }
    }
    load();
  }, [id, authLoading, user]);

  async function loadApplications() {
    try {
      // Fix: removed /api prefix — Axios client already adds /api
      const { data } = await api.get(`/projects/${id}/applications`);
      setApplications(data.applications || []);
    } catch {}
  }

  async function loadAiMatch() {
    try {
      // Fix: removed /api prefix
      const { data } = await api.get(`/ai/match/${id}`);
      setAiMatch(data);
    } catch {}
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === 'applications') loadApplications();
    if (t === 'ai-match') loadAiMatch();
  }

  async function handleApply() {
    setApplying(true); setApplyMsg('');
    try {
      // Fix: removed /api prefix
      await api.post(`/projects/${id}/apply`);
      setApplyMsg('success:Application sent!');
    } catch (err) {
      setApplyMsg('error:' + (err.response?.data?.error || 'Application failed.'));
    } finally { setApplying(false); }
  }

  async function handleDecide(appId, status) {
    setDeciding(appId);
    try {
      // Fix: removed /api prefix
      await api.patch(`/applications/${appId}`, { status });
      setApplications(a => a.map(x => x.id === appId ? { ...x, status } : x));
    } catch {} finally { setDeciding(null); }
  }

  // Use Firebase user from context instead of separate /auth/me call
  const isOwner = user && project && user.id === project.owner_id;
  const msgType = applyMsg.startsWith('success') ? 'success' : 'error';
  const msgText = applyMsg.replace(/^(success|error):/, '');

  const TABS = [
    { id: 'overview',      icon: 'dashboard',    label: 'Overview'      },
    { id: 'applications',  icon: 'group',        label: 'Applications', ownerOnly: true },
    { id: 'ai-match',      icon: 'psychology',   label: 'AI Match'      },
  ];

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    </AppLayout>
  );

  if (!project) return null;

  return (
    <AppLayout>
      <div className="page-content fade-in">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link href="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_tree</span>Projects
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          <span style={{ color: 'var(--text-secondary)' }}>{project.title}</span>
        </div>

        {/* Project header */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 700 }}>{project.title}</h1>
              <span className={`badge badge-${project.status === 'recruiting' ? 'green' : project.status === 'active' ? 'cyan' : 'amber'}`}>{project.status}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span className="dot dot-green" />LIVE
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, maxWidth: 700 }}>{project.description}</p>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              Owned by <span style={{ color: 'var(--cyan)' }}>{project.owner_name}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Link href={`/projects/${id}/chat`} className="btn btn-ghost">
              <span className="material-symbols-outlined">forum</span>
              Team Chat
            </Link>
            {!isOwner && project.status === 'recruiting' && (
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? <span className="spinner" /> : <span className="material-symbols-outlined">send</span>}
                {applying ? 'Applying...' : 'Apply Now'}
              </button>
            )}
          </div>
        </div>

        {applyMsg && (
          <div style={{ background: msgType === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,71,87,0.1)', border: `1px solid ${msgType === 'success' ? 'rgba(0,255,136,0.3)' : 'rgba(255,71,87,0.3)'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: msgType === 'success' ? 'var(--green)' : 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{msgType === 'success' ? 'check_circle' : 'error'}</span>
            {msgText}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {TABS.filter(t => !t.ownerOnly || isOwner).map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              border: 'none', borderBottom: tab === t.id ? '2px solid var(--cyan)' : '2px solid transparent',
              background: 'transparent', color: tab === t.id ? 'var(--cyan)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, transition: 'var(--transition)',
              marginBottom: -1,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* System nodes */}
              <div className="card" style={{ padding: 24 }}>
                <div className="section-header"><span className="section-title">Required Skills</span></div>
                {project.skills?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific skills required.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {project.skills?.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                          {s.level && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.level}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Workspace hint */}
              <div style={{ padding: 20, background: 'rgba(124,58,237,0.08)', border: '1px solid var(--purple-dim)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: '#a78bfa' }}>psychology</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#a78bfa' }}>AI Workspace Assistant</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  Let AI analyze candidate matches for this project based on skill alignment scores.
                </p>
                <button className="btn btn-ghost" onClick={() => handleTabChange('ai-match')} style={{ fontSize: 13, padding: '8px 16px', borderColor: 'rgba(124,58,237,0.4)', color: '#a78bfa' }}>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  View AI Match
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>Project Info</div>
                {[
                  { label: 'Owner',   value: project.owner_name },
                  { label: 'Status',  value: project.status },
                  { label: 'Skills',  value: `${project.skills?.length || 0} required` },
                  { label: 'Created', value: new Date(project.created_at).toLocaleDateString() },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <Link href={`/projects/${id}/chat`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 32, marginBottom: 8, display: 'block' }}>forum</span>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Join Team Chat</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real-time collaboration</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {tab === 'applications' && isOwner && (
          <div>
            {applications.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>group</span>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No applications yet. Share your project to attract candidates.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {applications.map(a => (
                  <div key={a.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--purple),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{(a.applicant_name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.applicant_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.applicant_email}</div>
                      {a.applicant_skills?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {a.applicant_skills.slice(0, 5).map(s => (
                            <span key={s.id} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-muted)' }}>{s.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {a.status === 'pending' ? (
                        <>
                          <button className="btn btn-outline" onClick={() => handleDecide(a.id, 'accepted')} disabled={deciding === a.id}
                            style={{ fontSize: 12, padding: '7px 14px', borderColor: 'var(--green)', color: 'var(--green)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                            Accept
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDecide(a.id, 'rejected')} disabled={deciding === a.id}
                            style={{ fontSize: 12, padding: '7px 14px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`badge badge-${a.status === 'accepted' ? 'green' : 'red'}`}>{a.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'ai-match' && (
          <div>
            {!aiMatch ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-muted)' }}>Loading AI match data...</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div className="stat-card" style={{ padding: '16px 24px' }}>
                    <div className="stat-value">{aiMatch.total_candidates}</div>
                    <div className="stat-label">Candidates</div>
                  </div>
                  <div className="stat-card" style={{ padding: '16px 24px' }}>
                    <div className="stat-value" style={{ color: aiMatch.ai_enabled ? 'var(--green)' : 'var(--amber)' }}>{aiMatch.ai_enabled ? 'AI' : 'SQL'}</div>
                    <div className="stat-label">Match Mode</div>
                  </div>
                </div>

                {aiMatch.candidates?.length === 0 ? (
                  <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>person_search</span>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No matching candidates found. Candidates need to set skills matching this project's requirements.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {aiMatch.candidates.map((c, i) => (
                      <div key={c.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: 'var(--text-muted)', width: 24 }}>#{i + 1}</span>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--cyan),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontWeight: 700, color: '#000' }}>{(c.name || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.matched_skills} matched skills</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, color: c.match_score >= 70 ? 'var(--green)' : c.match_score >= 40 ? 'var(--amber)' : 'var(--text-muted)' }}>{c.match_score}%</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>match score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
