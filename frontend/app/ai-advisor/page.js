'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

const MODES = [
  { id: 'advisor',  icon: 'psychology',   label: 'Advisor',       desc: 'AI engineering assistant' },
  { id: 'roadmap',  icon: 'map',          label: 'Generator',     desc: 'Project roadmap builder' },
  { id: 'debug',    icon: 'bug_report',   label: 'Debug Helper',  desc: 'Root cause analysis' },
];

/* ── Neural sphere animation ── */
function NeuralSphere({ active = false }) {
  return (
    <div style={{
      width: 120, height: 120, borderRadius: '50%', position: 'relative',
      background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.4) 0%, rgba(0,128,255,0.2) 40%, rgba(124,58,237,0.15) 100%)',
      boxShadow: active
        ? '0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.15), inset 0 0 40px rgba(0,212,255,0.1)'
        : '0 0 20px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05)',
      animation: 'float 3s ease-in-out infinite',
      border: '1px solid rgba(0,212,255,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Inner rings */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: '1px solid rgba(0,212,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'spin 8s linear infinite',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.35)',
          background: 'rgba(0,212,255,0.1)',
        }} />
      </div>
      {/* Nodes */}
      {[0, 60, 120, 180, 240, 300].map(deg => (
        <div key={deg} style={{
          position: 'absolute',
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--cyan)',
          boxShadow: '0 0 8px var(--cyan)',
          top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 42}px)`,
          left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 42}px)`,
          transform: 'translate(-50%, -50%)',
        }} />
      ))}
    </div>
  );
}

/* ── Metric bar ── */
function MetricBar({ label, value, max, color = 'var(--cyan)' }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 10, color, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{value.toFixed(1)}/{max} TB</span>
      </div>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
    </div>
  );
}

/* ── Chat message ── */
function ChatMessage({ msg }) {
  const isAI = msg.role === 'ai';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16,
      flexDirection: isAI ? 'row' : 'row-reverse' }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: isAI
          ? 'linear-gradient(135deg, var(--cyan), var(--blue))'
          : 'linear-gradient(135deg, var(--purple), var(--blue))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#000' }}>
          {isAI ? 'psychology' : 'person'}
        </span>
      </div>
      {/* Bubble */}
      <div style={{ maxWidth: '80%' }}>
        <div style={{
          padding: '12px 16px',
          borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isAI ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--cyan), var(--blue))',
          border: isAI ? '1px solid var(--border-subtle)' : 'none',
          color: isAI ? 'var(--text-primary)' : '#000',
          fontSize: 13,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        {msg.actions && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {msg.actions.map(a => (
              <button key={a} className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px', color: 'var(--cyan)', borderColor: 'var(--cyan-dim)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'JetBrains Mono',
          textAlign: isAI ? 'left' : 'right' }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

/* ── Roadmap result renderer ── */
function RenderValue({ val, depth = 0 }) {
  if (val === null || val === undefined) return <span>—</span>;
  if (typeof val === 'string') return <span>{val}</span>;
  if (typeof val === 'number' || typeof val === 'boolean') return <span>{String(val)}</span>;
  if (Array.isArray(val)) return (
    <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'none' }}>
      {val.map((item, i) => (
        <li key={i} style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }}>▸</span>
          <span><RenderValue val={item} depth={depth + 1} /></span>
        </li>
      ))}
    </ul>
  );
  if (typeof val === 'object') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(val).map(([k, v]) => (
        <div key={k}>
          <span style={{ color: 'var(--cyan)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{k.replace(/_/g, ' ')}: </span>
          <span style={{ color: 'var(--text-secondary)' }}><RenderValue val={v} depth={depth + 1} /></span>
        </div>
      ))}
    </div>
  );
  return <span>{String(val)}</span>;
}

export default function AIAdvisorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode]     = useState('advisor');
  const [loading, setLoading] = useState(false);
  const [input, setInput]   = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Neural Core V2.04 initialized. I have analyzed the current cluster status.\n\nI can help you with:\n• Project roadmap generation\n• Debug & root cause analysis\n• Team skill matching\n• Engineering recommendations\n\nHow would you like to proceed?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { icon: 'map', label: 'Generate Roadmap' },
        { icon: 'bug_report', label: 'Debug Helper' },
        { icon: 'person_search', label: 'Skill Match' },
      ],
    }
  ]);

  /* Roadmap form state */
  const [roadmapForm, setRoadmapForm] = useState({ title: '', description: '', skills: '', teamSize: 3, duration: '3 months' });
  const [debugForm, setDebugForm]     = useState({ problem: '', code: '', language: 'JavaScript' });
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [debugResult, setDebugResult]     = useState(null);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    setMessages(m => [...m, { role: 'user', content: userMsg, time: now() }]);
    setLoading(true);

    try {
      // Detect intent
      const isDebug = /bug|error|crash|fix|debug|fail|exception/i.test(userMsg);
      let aiReply = '';

      if (isDebug) {
        const { data } = await api.post('/ai/debug', { problem: userMsg, code: '', language: 'General' });
        aiReply = data.response || 'I analyzed your issue. Let me provide a detailed breakdown.';
      } else {
        const { data } = await api.post('/ai/roadmap', {
          title: userMsg.slice(0, 60),
          description: userMsg,
          skills: [],
          teamSize: 3,
          duration: '3 months',
        });
        if (data.roadmap?.phases) {
          const phases = data.roadmap.phases.map((p, i) =>
            `Phase ${i + 1}: ${p.name} (${p.duration})\n${Array.isArray(p.tasks) ? p.tasks.map(t => `  • ${t}`).join('\n') : ''}`
          ).join('\n\n');
          aiReply = `Here's a structured roadmap for your project:\n\n${phases}`;
          if (data.roadmap.risks?.length) {
            aiReply += `\n\n⚠ Risk Factors:\n${data.roadmap.risks.map(r => `• ${r}`).join('\n')}`;
          }
        } else {
          aiReply = 'I understand your project requirements. Could you provide more details about the tech stack and team size so I can generate a comprehensive roadmap?';
        }
      }

      setMessages(m => [...m, { role: 'ai', content: aiReply, time: now() }]);
    } catch {
      setMessages(m => [...m, {
        role: 'ai',
        content: 'Neural pipeline encountered an issue. Please check your connection and try again.',
        time: now(),
      }]);
    } finally { setLoading(false); }
  }

  async function handleRoadmap(e) {
    e.preventDefault(); setError(''); setLoading(true); setRoadmapResult(null);
    setMessages(m => [...m, {
      role: 'user',
      content: `Generate roadmap for: "${roadmapForm.title}"\n${roadmapForm.description}`,
      time: now(),
    }]);
    try {
      const { data } = await api.post('/ai/roadmap', {
        ...roadmapForm,
        skills: roadmapForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        teamSize: Number(roadmapForm.teamSize),
      });
      setRoadmapResult(data);
      const phases = data.roadmap?.phases?.map((p, i) =>
        `Phase ${i + 1}: ${p.name} (${p.duration})`
      ).join('\n') || 'Roadmap generated successfully.';
      setMessages(m => [...m, { role: 'ai', content: `✅ Roadmap generated!\n\n${phases}\n\nSee the structured output panel on the right.`, time: now() }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed.');
    } finally { setLoading(false); }
  }

  async function handleDebug(e) {
    e.preventDefault(); setError(''); setLoading(true); setDebugResult(null);
    setMessages(m => [...m, {
      role: 'user',
      content: `Debug: ${debugForm.problem}`,
      time: now(),
    }]);
    try {
      const { data } = await api.post('/ai/debug', debugForm);
      setDebugResult(data);
      setMessages(m => [...m, { role: 'ai', content: `🔍 Analysis complete. See the debug output panel on the right for detailed findings.`, time: now() }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.');
    } finally { setLoading(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <AppLayout>
      <div className="page-content fade-in" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 320px', gap: 20, minHeight: 'calc(100vh - 56px)', padding: '20px 0' }}>

          {/* ── Left sidebar nav ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Neural sphere */}
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <NeuralSphere active={loading} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  CORE SYNC: {loading ? 'PROCESSING' : 'SYNCHRONIZED'}
                </div>
              </div>
            </div>

            {/* Mode selector */}
            <div className="card" style={{ padding: '8px 0' }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setError(''); setRoadmapResult(null); setDebugResult(null); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                    background: mode === m.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${mode === m.id ? 'var(--cyan)' : 'transparent'}`,
                    color: mode === m.id ? 'var(--cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: mode === m.id ? 600 : 400 }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* System metrics */}
            <div className="card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>System Metrics</div>
              <MetricBar label="Corpus Load" value={14.2} max={20} color="var(--cyan)" />
              <MetricBar label="Memory Buffer" value={12.8} max={32} color="#a78bfa" />
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { label: 'Model',    val: 'Gemini 2.0 Flash', icon: 'hub' },
                  { label: 'Context',  val: '1M tokens',         icon: 'memory' },
                  { label: 'Status',   val: 'Active',            icon: 'check_circle' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 13 }}>{s.icon}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.label}:</span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              New Simulation
            </button>
          </div>

          {/* ── Center: Chat ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 500 }}>
            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14 }}>AI Engineering Assistant</span>
                  <span className="badge badge-cyan" style={{ fontSize: 9 }}>NEURAL CORE V2.04</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span className="dot dot-cyan dot-pulse" style={{ width: 6, height: 6 }} />
                  <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'JetBrains Mono' }}>INITIALIZED</span>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
              {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--cyan), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#000' }}>psychology</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input — form differs by mode */}
            {mode === 'advisor' ? (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(4,8,15,0.5)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--cyan)', fontWeight: 700, pointerEvents: 'none' }}>COM:</span>
                    <textarea
                      className="input"
                      rows={1}
                      placeholder="Command the Neural Core..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{ resize: 'none', paddingLeft: 52, paddingRight: 12, minHeight: 42, maxHeight: 100, lineHeight: 1.5, overflowY: 'auto', fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn btn-primary" style={{ padding: '10px 14px', flexShrink: 0 }}>
                    {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {['Generate a project roadmap', 'Debug my code', 'Suggest team skills', 'Optimize architecture'].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'var(--transition)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan-dim)'; e.currentTarget.style.color = 'var(--cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            ) : mode === 'roadmap' ? (
              <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)' }}>
                {error && <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: 'var(--red)', fontSize: 12 }}>{error}</div>}
                <form onSubmit={handleRoadmap}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="input-label">Project Title</label>
                      <input className="input" placeholder="AI Platform..." value={roadmapForm.title} onChange={e => setRoadmapForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="input-label">Skills</label>
                      <input className="input" placeholder="React, Node.js..." value={roadmapForm.skills} onChange={e => setRoadmapForm(f => ({ ...f, skills: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="input-label">Description</label>
                    <textarea className="input" rows={2} placeholder="Describe your project..." value={roadmapForm.description} onChange={e => setRoadmapForm(f => ({ ...f, description: e.target.value }))} required style={{ resize: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" type="number" min={1} max={20} value={roadmapForm.teamSize} onChange={e => setRoadmapForm(f => ({ ...f, teamSize: e.target.value }))} style={{ width: 80 }} />
                    <select className="input" value={roadmapForm.duration} onChange={e => setRoadmapForm(f => ({ ...f, duration: e.target.value }))} style={{ flex: 1 }}>
                      {['1 month','2 months','3 months','6 months','1 year'].map(d => <option key={d}>{d}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
                      {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>}
                      Generate
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)' }}>
                {error && <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: 'var(--red)', fontSize: 12 }}>{error}</div>}
                <form onSubmit={handleDebug}>
                  <div style={{ marginBottom: 8 }}>
                    <textarea className="input" rows={3} placeholder="Describe the bug or issue..." value={debugForm.problem} onChange={e => setDebugForm(f => ({ ...f, problem: e.target.value }))} required style={{ resize: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea className="input" rows={2} placeholder="Paste code snippet (optional)..." value={debugForm.code} onChange={e => setDebugForm(f => ({ ...f, code: e.target.value }))} style={{ resize: 'none', flex: 1, fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <select className="input" value={debugForm.language} onChange={e => setDebugForm(f => ({ ...f, language: e.target.value }))} style={{ width: 120 }}>
                        {['JavaScript','TypeScript','Python','Rust','Go','Java','C++','SQL'].map(l => <option key={l}>{l}</option>)}
                      </select>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bug_report</span>}
                        Analyze
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ── Right: Results panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!roadmapResult && !debugResult ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--cyan)', fontSize: 26 }}>psychology</span>
                </div>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Neural Core Ready</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>Chat with the AI or use the Generator / Debug tabs to see structured output here.</p>
              </div>
            ) : roadmapResult ? (
              <div className="card" style={{ padding: 20, overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--cyan)' }}>map</span>
                  <h3 style={{ fontSize: 14 }}>Generated Roadmap</h3>
                  <span className={`badge ${roadmapResult.ai_available ? 'badge-green' : 'badge-amber'}`} style={{ marginLeft: 'auto', fontSize: 9 }}>
                    {roadmapResult.ai_available ? 'AI' : 'Template'}
                  </span>
                </div>
                {roadmapResult.roadmap?.phases?.map((phase, i) => (
                  <div key={i} style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid var(--cyan-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cyan)', color: '#000', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{phase.name}</span>
                      <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontSize: 9 }}>{phase.duration}</span>
                    </div>
                    {phase.tasks && (
                      <ul style={{ margin: 0, paddingLeft: 28, listStyle: 'none' }}>
                        {(Array.isArray(phase.tasks) ? phase.tasks : [phase.tasks]).map((t, j) => (
                          <li key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, display: 'flex', gap: 6 }}>
                            <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>▸</span>{typeof t === 'string' ? t : JSON.stringify(t)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {roadmapResult.roadmap?.risks?.length > 0 && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>⚠ Risk Factors</div>
                    {roadmapResult.roadmap.risks.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>• {typeof r === 'string' ? r : JSON.stringify(r)}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 20, overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--amber)' }}>bug_report</span>
                  <h3 style={{ fontSize: 14 }}>Debug Analysis</h3>
                  <span className={`badge ${debugResult.ai_available ? 'badge-green' : 'badge-amber'}`} style={{ marginLeft: 'auto', fontSize: 9 }}>
                    {debugResult.ai_available ? 'AI' : 'Template'}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, fontFamily: 'JetBrains Mono' }}>
                  {debugResult.response}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
