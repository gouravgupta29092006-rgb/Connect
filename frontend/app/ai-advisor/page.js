'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { generateRoadmap, aiDebug } from '@/lib/api';

// Safely flatten any value into an array of strings for rendering
function toStringArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) =>
      typeof item === 'object' && item !== null
        ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')
        : String(item)
    );
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  return [String(val)];
}

export default function AIAdvisorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('roadmap');

  // Roadmap state
  const [roadmapForm, setRoadmapForm] = useState({
    title: '', description: '', skills: '', teamSize: 4, duration: '3 months',
  });
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');

  // Debug state
  const [debugForm, setDebugForm] = useState({ problem: '', code: '', language: '' });
  const [debugResult, setDebugResult] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const handleRoadmap = async (e) => {
    e.preventDefault();
    setRoadmapError('');
    setRoadmapLoading(true);
    try {
      const { data } = await generateRoadmap({
        ...roadmapForm,
        skills: roadmapForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        teamSize: parseInt(roadmapForm.teamSize),
      });
      setRoadmapResult(data);
    } catch (err) {
      setRoadmapError(err.response?.data?.error || 'Failed to generate roadmap');
    }
    setRoadmapLoading(false);
  };

  const handleDebug = async (e) => {
    e.preventDefault();
    setDebugError('');
    setDebugLoading(true);
    try {
      const { data } = await aiDebug(debugForm);
      setDebugResult(data);
    } catch (err) {
      setDebugError(err.response?.data?.error || 'Failed to get help');
    }
    setDebugLoading(false);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">
          <span className="gradient-text">AI Advisor</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Powered by Google Gemini — get project roadmaps and debugging help
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        {[
          { id: 'roadmap', icon: '📋', label: 'Project Roadmap' },
          { id: 'debug', icon: '🛠', label: 'Debug Helper' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === t.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Roadmap tab */}
      {activeTab === 'roadmap' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleRoadmap} className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Describe Your Project</h2>

              {roadmapError && (
                <div className="p-3 rounded-lg text-sm mb-4"
                     style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)' }}>
                  {roadmapError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Project Title
                  </label>
                  <input
                    type="text" className="input" placeholder="e.g., Smart Campus App"
                    value={roadmapForm.title}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    className="input" rows={3} placeholder="What does the project do?"
                    value={roadmapForm.description}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Tech Stack / Skills <span style={{ color: 'var(--text-muted)' }}>(comma separated)</span>
                  </label>
                  <input
                    type="text" className="input" placeholder="React, Python, PostgreSQL"
                    value={roadmapForm.skills}
                    onChange={(e) => setRoadmapForm({ ...roadmapForm, skills: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Team Size
                    </label>
                    <input
                      type="number" className="input" min={1} max={20}
                      value={roadmapForm.teamSize}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, teamSize: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Duration
                    </label>
                    <select className="input" value={roadmapForm.duration}
                            onChange={(e) => setRoadmapForm({ ...roadmapForm, duration: e.target.value })}>
                      {['2 weeks', '1 month', '2 months', '3 months', '4 months', '6 months'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={roadmapLoading} className="btn btn-primary w-full py-3">
                  {roadmapLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }} />
                      Generating roadmap...
                    </span>
                  ) : (
                    '🤖 Generate Roadmap'
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Roadmap result */}
          <div>
            {roadmapResult ? (
              <div className="space-y-4 animate-slideUp">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-accent text-xs">
                    {roadmapResult.ai_available ? '✨ AI Generated' : '⚡ Template'}
                  </span>
                </div>

                {roadmapResult.roadmap?.phases && (
                  <div className="space-y-3">
                    {roadmapResult.roadmap.tech_stack && (
                      <div className="card">
                        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>TECH STACK</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {toStringArray(roadmapResult.roadmap.tech_stack).map((t, i) => (
                            <span key={i} className="badge badge-accent text-xs">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {roadmapResult.roadmap.phases.map((phase, i) => (
                      <div key={i} className="card" style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent)' }}>
                        <h3 className="font-semibold mb-1">{phase.name || `Phase ${i + 1}`}</h3>
                        {phase.duration && (
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>⏱ {phase.duration}</p>
                        )}
                        {phase.tasks && (
                          <ul className="space-y-1">
                            {toStringArray(phase.tasks).map((task, j) => (
                              <li key={j} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--accent)' }}>•</span> {task}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}

                    {roadmapResult.roadmap.risks && (
                      <div className="card" style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--warning)' }}>
                        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--warning)' }}>⚠️ RISKS</h3>
                        <ul className="space-y-1">
                          {toStringArray(roadmapResult.roadmap.risks).map((r, i) => (
                            <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {roadmapResult.roadmap_text && (
                  <div className="card">
                    <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                      {roadmapResult.roadmap_text}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-center py-16">
                <div className="text-4xl mb-4">📋</div>
                <p className="font-medium mb-1">Your roadmap will appear here</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Fill in your project details and let AI plan it for you
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug tab */}
      {activeTab === 'debug' && (
        <div className="space-y-6">
          <form onSubmit={handleDebug} className="card">
            <h2 className="text-lg font-semibold mb-4">Describe Your Problem</h2>

            {debugError && (
              <div className="p-3 rounded-lg text-sm mb-4"
                   style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)' }}>
                {debugError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Problem Description
                </label>
                <textarea
                  className="input" rows={3}
                  placeholder="e.g., My API returns 500 when I try to join two tables..."
                  value={debugForm.problem}
                  onChange={(e) => setDebugForm({ ...debugForm, problem: e.target.value })}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Code <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <textarea
                  className="input font-mono text-sm" rows={6}
                  placeholder="Paste your code here..."
                  value={debugForm.code}
                  onChange={(e) => setDebugForm({ ...debugForm, code: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Language <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="text" className="input" placeholder="JavaScript, Python, SQL..."
                  value={debugForm.language}
                  onChange={(e) => setDebugForm({ ...debugForm, language: e.target.value })}
                />
              </div>

              <button type="submit" disabled={debugLoading} className="btn btn-primary w-full py-3">
                {debugLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }} />
                    Analyzing...
                  </span>
                ) : (
                  '🛠 Get Debug Help'
                )}
              </button>
            </div>
          </form>

          {/* Debug result */}
          {debugResult && (
            <div className="card animate-slideUp" style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="badge badge-accent text-xs">
                  {debugResult.ai_available ? '✨ AI Analysis' : '⚡ Template'}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {debugResult.response}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
