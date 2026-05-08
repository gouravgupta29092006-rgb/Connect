'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjects, getMyApplications, getNotifications } from '@/lib/api';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [myProjects, setMyProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProjects().catch(() => ({ data: { projects: [] } })),
      getMyApplications().catch(() => ({ data: { applications: [] } })),
      getNotifications().catch(() => ({ data: { notifications: [] } })),
    ]).then(([projRes, appRes, notifRes]) => {
      const allProjects = projRes.data.projects || [];
      setMyProjects(allProjects.filter((p) => p.owner_id === user.id));
      setApplications(appRes.data.applications || []);
      setNotifications((notifRes.data.notifications || []).filter((n) => !n.is_read).slice(0, 5));
      setDataLoading(false);
    });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const statusColors = {
    recruiting: { bg: 'rgba(0,255,198,0.1)', color: 'var(--accent)', border: 'var(--accent)' },
    active: { bg: 'rgba(77,154,255,0.1)', color: 'var(--info)', border: 'var(--info)' },
    completed: { bg: 'rgba(136,136,160,0.1)', color: 'var(--text-secondary)', border: 'var(--text-muted)' },
    pending: { bg: 'rgba(255,184,77,0.1)', color: 'var(--warning)', border: 'var(--warning)' },
    accepted: { bg: 'rgba(0,255,198,0.1)', color: 'var(--accent)', border: 'var(--accent)' },
    rejected: { bg: 'rgba(255,77,106,0.1)', color: 'var(--danger)', border: 'var(--danger)' },
  };

  const getStatusStyle = (status) => statusColors[status] || statusColors.recruiting;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">
          Welcome back, <span className="gradient-text">{user.full_name?.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Here&apos;s what&apos;s happening with your projects</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { href: '/projects/new', icon: '➕', label: 'New Project', desc: 'Create a project' },
          { href: '/projects', icon: '🔍', label: 'Browse', desc: 'Find projects' },
          { href: '/profile', icon: '⚙️', label: 'Profile', desc: 'Edit your skills' },
          { href: '/ai-advisor', icon: '🤖', label: 'AI Advisor', desc: 'Get help' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="card group text-center hover:glow-accent">
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="text-sm font-semibold">{action.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{action.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Projects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Projects</h2>
            <Link href="/projects/new" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              + Create new
            </Link>
          </div>

          {dataLoading ? (
            <div className="card flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : myProjects.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <p className="font-medium mb-1">No projects yet</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Create your first project to get started</p>
              <Link href="/projects/new" className="btn btn-primary">Create Project</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myProjects.slice(0, 5).map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="card block group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold group-hover:text-[var(--accent)] transition-colors">
                      {project.title}
                    </h3>
                    <span className="badge text-xs px-2 py-0.5"
                          style={{
                            background: getStatusStyle(project.status).bg,
                            color: getStatusStyle(project.status).color,
                            borderColor: getStatusStyle(project.status).border,
                          }}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                    {project.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Link href="/notifications" className="text-sm" style={{ color: 'var(--accent)' }}>View all</Link>
            </div>
            {notifications.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="card py-3 px-4">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{n.content}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Applications</h2>
            </div>
            {applications.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-2xl mb-2">📩</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No applications yet</p>
                <Link href="/projects" className="btn btn-secondary text-xs mt-3">Browse Projects</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 4).map((app) => (
                  <Link key={app.id} href={`/projects/${app.project_id}`} className="card block py-3 px-4 group">
                    <p className="text-sm font-medium group-hover:text-[var(--accent)] transition-colors">{app.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge text-xs py-0"
                            style={{
                              background: getStatusStyle(app.status).bg,
                              color: getStatusStyle(app.status).color,
                              borderColor: getStatusStyle(app.status).border,
                            }}>
                        {app.status}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
