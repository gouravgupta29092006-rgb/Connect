'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '@/lib/api';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
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
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {dataLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🔔</div>
          <p className="font-medium">No notifications</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card flex items-start justify-between gap-4"
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: n.is_read ? 'var(--border)' : 'var(--accent)',
                opacity: n.is_read ? 0.7 : 1,
              }}
            >
              <div className="flex-1">
                <p className="text-sm">{n.content}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="btn btn-secondary text-xs py-1 px-2 shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
