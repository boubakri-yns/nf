import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { NotificationItem } from '../types';
import { invalidateCacheByPrefix, readCache } from '../utils/queryCache';
import {
  cacheNotificationsList,
  cacheNotificationsPreview,
  getNotificationsListCacheKey,
} from '../utils/appData';

export function NotificationsPage() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const cached = readCache<NotificationItem[]>(getNotificationsListCacheKey());
    if (cached) {
      setList(cached);
      setLoading(false);
      void api.get('/notifications').then(({ data }) => {
        const nextList = data.data ?? [];
        setList(nextList);
        cacheNotificationsList(nextList);
      }).catch(() => undefined);
      return;
    }

    setLoading(true);
    const { data } = await api.get('/notifications');
    const nextList = data.data ?? [];
    setList(nextList);
    cacheNotificationsList(nextList);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const markAll = async () => {
    const previous = list;
    const next = list.map((item) => ({ ...item, est_lue: true }));
    setList(next);
    cacheNotificationsList(next);
    cacheNotificationsPreview({
      unread_count: 0,
      items: next.slice(0, 5),
    });

    try {
      await api.patch('/notifications/lues/toutes');
    } catch {
      setList(previous);
      cacheNotificationsList(previous);
      invalidateCacheByPrefix('notifications:preview');
    }
  };

  const markOne = async (id: number) => {
    const previous = list;
    const next = list.map((item) => (item.id === id ? { ...item, est_lue: true } : item));
    setList(next);
    cacheNotificationsList(next);
    cacheNotificationsPreview({
      unread_count: next.filter((item) => !item.est_lue).length,
      items: next.slice(0, 5),
    });

    try {
      await api.patch(`/notifications/${id}/lue`);
    } catch {
      setList(previous);
      cacheNotificationsList(previous);
      invalidateCacheByPrefix('notifications:preview');
    }
  };

  return (
    <div className="card">
      <div className="notification-header">
        <h2>Notifications</h2>
        <button onClick={markAll}>Marquer toutes lues</button>
      </div>
      {loading && <p>Chargement des notifications...</p>}
      {list.map((n) => (
        <div key={n.id} className="card" style={{ marginBottom: 10, background: n.est_lue ? '#f5f5f5' : '#fee2e2' }}>
          <strong>{n.titre}</strong>
          <p>{n.message}</p>
          <div className="action-row">
            {n.data?.note_id && <Link to={`/notes/${n.data.note_id}`}>Ouvrir la note</Link>}
            {!n.est_lue && <button className="secondary" onClick={() => markOne(n.id)}>Marquer comme lue</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
