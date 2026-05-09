'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProfile, updateProfile, getSkills, assignSkills, removeSkill } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [allSkills, setAllSkills] = useState([]);
  const [groupedSkills, setGroupedSkills] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', institution: '', github_url: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Skill states
  const [skillMode, setSkillMode] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [profRes, skillsRes] = await Promise.all([getProfile(), getSkills()]);
      const p = profRes.data.profile;
      setProfile(p);
      setEditForm({ bio: p.bio || '', institution: p.institution || '', github_url: p.github_url || '' });
      setSelectedSkills((p.skills || []).map((s) => ({ skill_id: s.skill_id || s.id, name: s.name, level: s.level || 3, importance: s.importance || 3 })));
      setAllSkills(skillsRes.data.skills || []);
      setGroupedSkills(skillsRes.data.grouped || {});
    } catch {}
    setDataLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSaveProfile = async () => {
    setEditError('');
    setSaving(true);
    try {
      const { data } = await updateProfile(editForm);
      setProfile(data.profile);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const toggleSkill = (skill) => {
    const existing = selectedSkills.find((s) => s.skill_id === skill.id);
    if (existing) {
      setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, { skill_id: skill.id, name: skill.name, level: 3, importance: 3 }]);
    }
  };

  const updateLevel = (skillId, level) => {
    setSelectedSkills(selectedSkills.map((s) =>
      s.skill_id === skillId ? { ...s, level } : s
    ));
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      await assignSkills(selectedSkills.map(({ skill_id, level, importance }) => ({ skill_id, level, importance })));
      await fetchData();
      setSkillMode(false);
    } catch {}
    setSavingSkills(false);
  };

  const filteredSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (loading || dataLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
               style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '2px solid var(--accent)' }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
            {profile?.institution && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                🏛 {profile.institution}
              </p>
            )}
            {profile?.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                 className="text-sm inline-flex items-center gap-1 mt-0.5" style={{ color: 'var(--info)' }}>
                🔗 GitHub
              </a>
            )}
          </div>
          <button onClick={() => setEditing(!editing)} className="btn btn-secondary text-sm">
            {editing ? 'Cancel' : '✏️ Edit Profile'}
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-6 pt-6 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
            {editError && (
              <div className="p-3 rounded-lg text-sm"
                   style={{ background: 'rgba(255,77,106,0.1)', color: 'var(--danger)' }}>
                {editError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bio</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Tell others about yourself, your interests, and what you're working on..."
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Institution</label>
                <input
                  type="text" className="input" placeholder="IIT Bombay"
                  value={editForm.institution}
                  onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>GitHub URL</label>
                <input
                  type="url" className="input" placeholder="https://github.com/username"
                  value={editForm.github_url}
                  onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                />
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Bio display */}
        {!editing && profile?.bio && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {profile.bio}
            </p>
          </div>
        )}
      </div>

      {/* Skills section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Skills</h2>
          <button onClick={() => setSkillMode(!skillMode)} className="btn btn-secondary text-sm">
            {skillMode ? 'Cancel' : '🎯 Manage Skills'}
          </button>
        </div>

        {/* Current skills display */}
        {!skillMode && (
          profile?.skills?.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.skills.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Level</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <div key={v} className="w-3 h-3 rounded-sm"
                             style={{ background: v <= s.level ? 'var(--accent)' : 'var(--border)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">🎯</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No skills added yet</p>
              <button onClick={() => setSkillMode(true)} className="btn btn-primary text-sm mt-3">
                Add Skills
              </button>
            </div>
          )
        )}

        {/* Skill editor */}
        {skillMode && (
          <div className="space-y-4">
            {/* Selected skills with level control */}
            {selectedSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Selected ({selectedSkills.length})
                </p>
                {selectedSkills.map((s) => (
                  <div key={s.skill_id} className="flex items-center justify-between p-2.5 rounded-lg"
                       style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,255,198,0.2)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{s.name}</span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Level:</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => updateLevel(s.skill_id, v)}
                            className="w-7 h-7 rounded text-xs font-bold transition-all"
                            style={{
                              background: v <= s.level ? 'var(--accent)' : 'var(--bg-card)',
                              color: v <= s.level ? 'var(--bg-primary)' : 'var(--text-muted)',
                              border: `1px solid ${v <= s.level ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => toggleSkill({ id: s.skill_id })}
                              className="text-sm px-1" style={{ color: 'var(--danger)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search + pick */}
            <input
              type="text" className="input"
              placeholder="Search skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredSkills.map((skill) => {
                const isSelected = selectedSkills.some((s) => s.skill_id === skill.id);
                return (
                  <button
                    key={skill.id}
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

            <button onClick={handleSaveSkills} disabled={savingSkills} className="btn btn-primary w-full">
              {savingSkills ? 'Saving...' : `Save ${selectedSkills.length} Skill${selectedSkills.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
