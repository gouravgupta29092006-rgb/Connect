'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { getProjects } from '@/lib/api';

function ProjectsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    getProjects(params)
      .then(({ data }) => {
        setProjects(data.projects || []);
        setTotal(data.total || data.projects?.length || 0);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, search, statusFilter]);

  const statusColors = {
    recruiting: { bg: 'rgba(0,255,198,0.1)', color: 'var(--accent)', border: 'var(--accent)' },
    active: { bg: 'rgba(77,154,255,0.1)', color: 'var(--info)', border: 'var(--info)' },
    completed: { bg: 'rgba(136,136,160,0.1)', color: 'var(--text-secondary)', border: 'var(--text-muted)' },
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {total} project{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          ➕ New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            className="input"
            placeholder="Search projects by title, description, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['', 'recruiting', 'active', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn text-sm py-2 px-4"
              style={{
                background: statusFilter === s ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: statusFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <p className="font-medium mb-2">No projects found</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {search || statusFilter ? 'Try different search terms or filters' : 'Be the first to create one!'}
          </p>
          <Link href="/projects/new" className="btn btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const sc = statusColors[project.status] || statusColors.recruiting;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="card group hover:glow-accent">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge text-xs"
                        style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                    {project.status}
                  </span>
                  {project.skills?.length > 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {project.skills.length} skill{project.skills.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                  {project.title}
                </h3>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    by {project.owner_name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                {project.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.skills.slice(0, 4).map((s, i) => (
                      <span key={i} className="badge text-xs py-0">{s.name}</span>
                    ))}
                    {project.skills.length > 4 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        +{project.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
