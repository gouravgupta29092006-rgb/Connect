'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getProject, deleteProject, applyToProject,
  getProjectApplications, updateApplication, matchCandidates,
} from '@/lib/api';

export default function ProjectDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);
  const [tab, setTab] = useState('details');
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !projectId) return;
    getProject(projectId)
      .then(({ data }) => {
        setProject(data.project);
        if (data.project.owner_id === user.id) {
          getProjectApplications(projectId)
            .then(({ data: appData }) => setApplications(appData.applications || []))
            .catch(() => {});
        }
      })
      .catch(() => router.push('/projects'))
      .finally(() => setDataLoading(false));
  }, [user, projectId, router]);

  const isOwner = project?.owner_id === user?.id;

  const handleApply = async () => {
    setApplyError('');
    setApplying(true);
    try {
      await applyToProject(projectId, applyMsg);
      setApplySuccess(true);
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleDecision = async (appId, status) => {
    try {
      await updateApplication(appId, status);
      setApplications(applications.map((a) =>
        a.id === appId ? { ...a, status } : a
      ));
    } catch {}
  };

  const handleMatch = async () => {
    setMatchLoading(true);
    try {
      const { data } = await matchCandidates(projectId);
      setCandidates(data);
    } catch {}
    setMatchLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(projectId);
      router.push('/projects');
    } catch {}
  };

  const statusColors = {
    recruiting: { bg: 'rgba(0,255,198,0.1)', color: 'var(--accent)', border: 'var(--accent)' },
    active: { bg: 'rgba(77,154,255,0.1)', color: 'var(--info)', border: 'var(--info)' },
    completed: { bg: 'rgba(136,136,160,0.1)', color: 'var(--text-secondary)', border: 'var(--text-muted)' },
    pending: { bg: 'rgba(255,184,77,0.1)', color: 'var(--warning)', border: 'var(--warning)' },
    accepted: { bg: 'rgba(0,255,198,0.1)', color: 'var(--accent)', border: 'var(--accent)' },
    rejected: { bg: 'rgba(255,77,106,0.1)', color: 'var(--danger)', border: 'var(--danger)' },
  };
  const getStatusStyle = (s) => statusColors[s] || statusColors.recruiting;

  if (loading || dataLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="badge" style={{
              background: getStatusStyle(project.status).bg,
              color: getStatusStyle(project.status).color,
              borderColor: getStatusStyle(project.status).border,
            }}>
              {project.status}
            </span>
            {isOwner && <span className="badge badge-info text-xs">Owner</span>}
          </div>
          <h1 className="text-3xl font-bold mb-1">{project.title}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            by {project.owner_name} · {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <Link href={`/projects/${projectId}/chat`} className="btn btn-secondary text-sm">
                💬 Team Chat
              </Link>
              <button onClick={handleDelete} className="btn btn-danger text-sm">Delete</button>
            </>
          )}
          {!isOwner && (
            <Link href={`/projects/${projectId}/chat`} className="btn btn-secondary text-sm">
              💬 Chat
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isOwner && (
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          {['details', 'applications', 'match'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'match' && !candidates) handleMatch(); }}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {t === 'details' ? '📄 Details' : t === 'applications' ? `📩 Applications (${applications.length})` : '🤖 AI Match'}
            </button>
          ))}
        </div>
      )}

      {/* Details tab */}
      {tab === 'details' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            </div>

            {/* Apply section for non-owners */}
            {!isOwner && project.status === 'recruiting' && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Apply to Join</h2>
                {applySuccess ? (
                  <div className="p-4 rounded-lg text-center"
                       style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    ✅ Application submitted! The owner will review it.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applyError && (
                      <div className="p-3 rounded-lg text-sm"
                           style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)' }}>
                        {applyError}
                      </div>
                    )}
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Why do you want to join? (optional)"
                      value={applyMsg}
                      onChange={(e) => setApplyMsg(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                    <button onClick={handleApply} disabled={applying} className="btn btn-primary">
                      {applying ? 'Applying...' : '📩 Apply Now'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>REQUIRED SKILLS</h3>
              {project.skills?.length > 0 ? (
                <div className="space-y-2">
                  {project.skills.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="badge badge-accent text-xs">{s.name}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <div key={v} className="w-2 h-2 rounded-full"
                               style={{ background: v <= s.importance ? 'var(--accent)' : 'var(--border)' }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No specific skills listed</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Applications tab (owner only) */}
      {tab === 'applications' && isOwner && (
        <div>
          {applications.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">📩</div>
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Share your project to attract applicants
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{app.applicant_name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{app.applicant_email}</p>
                    </div>
                    <span className="badge text-xs"
                          style={{
                            background: getStatusStyle(app.status).bg,
                            color: getStatusStyle(app.status).color,
                            borderColor: getStatusStyle(app.status).border,
                          }}>
                      {app.status}
                    </span>
                  </div>
                  {app.message && (
                    <p className="text-sm mb-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      &quot;{app.message}&quot;
                    </p>
                  )}
                  {app.applicant_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {app.applicant_skills.map((s, i) => (
                        <span key={i} className="badge text-xs">{s.name} (Lv{s.level})</span>
                      ))}
                    </div>
                  )}
                  {app.status === 'pending' && (
                    <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => handleDecision(app.id, 'accepted')} className="btn btn-primary text-sm flex-1">
                        ✅ Accept
                      </button>
                      <button onClick={() => handleDecision(app.id, 'rejected')} className="btn btn-danger text-sm flex-1">
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match tab (owner only) */}
      {tab === 'match' && isOwner && (
        <div>
          {matchLoading ? (
            <div className="card flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                     style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI is analyzing candidates...</p>
              </div>
            </div>
          ) : candidates ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Found {candidates.total_candidates} candidate{candidates.total_candidates !== 1 ? 's' : ''} · AI: {candidates.ai_enabled ? '✅ On' : '⚡ SQL-only'}
                </p>
                <button onClick={handleMatch} className="btn btn-secondary text-sm">🔄 Refresh</button>
              </div>
              {candidates.ai_summary && (
                <div className="card" style={{ borderColor: 'var(--accent)', borderLeftWidth: '3px' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>AI SUMMARY</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {candidates.ai_summary}
                  </p>
                </div>
              )}
              {candidates.candidates?.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching candidates found</p>
                </div>
              ) : (
                candidates.candidates?.map((c, i) => (
                  <div key={c.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                             style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                          #{i + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{c.full_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.institution || 'No institution'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold gradient-text">{c.match_score}%</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>match</p>
                      </div>
                    </div>
                    {c.matched_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.matched_skills.map((s, j) => (
                          <span key={j} className="badge badge-accent text-xs">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
