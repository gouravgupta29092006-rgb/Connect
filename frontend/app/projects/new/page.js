'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSkills, createProject } from '@/lib/api';

export default function NewProjectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allSkills, setAllSkills] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', status: 'recruiting' });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getSkills().then(({ data }) => setAllSkills(data.skills || [])).catch(() => {});
  }, [user]);

  const toggleSkill = (skill) => {
    const existing = selectedSkills.find((s) => s.skill_id === skill.id);
    if (existing) {
      setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, { skill_id: skill.id, name: skill.name, importance: 3 }]);
    }
  };

  const updateImportance = (skillId, importance) => {
    setSelectedSkills(selectedSkills.map((s) =>
      s.skill_id === skillId ? { ...s, importance } : s
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }
    setSubmitting(true);
    try {
      const { data } = await createProject({
        ...form,
        skills: selectedSkills.map(({ skill_id, importance }) => ({ skill_id, importance })),
      });
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-2">Create Project</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        Define your project and let AI find the best teammates
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg text-sm"
               style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,77,106,0.2)' }}>
            {error}
          </div>
        )}

        {/* Title */}
        <div className="card">
          <label className="block text-sm font-medium mb-2">Project Title</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., AI-Powered Campus Navigation App"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            className="input"
            rows={5}
            placeholder="Describe what your project does, the problem it solves, and what kind of teammates you're looking for..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Status */}
        <div className="card">
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex gap-2">
            {['recruiting', 'active', 'completed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className="btn text-sm py-2 px-4"
                style={{
                  background: form.status === s ? 'var(--accent-dim)' : 'transparent',
                  color: form.status === s ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${form.status === s ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="card">
          <label className="block text-sm font-medium mb-2">
            Required Skills
            <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
              ({selectedSkills.length} selected)
            </span>
          </label>

          {/* Selected skills */}
          {selectedSkills.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedSkills.map((s) => (
                <div key={s.skill_id} className="flex items-center justify-between p-2 rounded-lg"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-3">
                    <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Importance:</label>
                    <select
                      value={s.importance}
                      onChange={(e) => updateImportance(s.skill_id, parseInt(e.target.value))}
                      className="input py-1 px-2 text-sm w-16"
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleSkill({ id: s.skill_id })}
                      className="text-sm px-2 py-1 rounded"
                      style={{ color: 'var(--danger)' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skill search */}
          <input
            type="text"
            className="input mb-3"
            placeholder="Search skills..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
          />

          {/* Skill grid */}
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredSkills.map((skill) => {
              const isSelected = selectedSkills.some((s) => s.skill_id === skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="badge cursor-pointer transition-all"
                  style={{
                    background: isSelected ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {isSelected ? '✓ ' : ''}{skill.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 text-base">
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }} />
              Creating...
            </span>
          ) : (
            '🚀 Create Project'
          )}
        </button>
      </form>
    </div>
  );
}
