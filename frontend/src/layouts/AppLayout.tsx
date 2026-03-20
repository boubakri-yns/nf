import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Bell } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { NotificationItem } from '../types';
import { readCache } from '../utils/queryCache';
import {
  cacheNotificationsList,
  cacheNotificationsPreview,
  getNotificationsListCacheKey,
  getNotificationsPreviewCacheKey,
  prefetchCategories,
  prefetchDashboard,
  prefetchNotesList,
  prefetchNotificationsPreview,
} from '../utils/appData';

interface NotificationPreviewResponse {
  unread_count: number;
  items: NotificationItem[];
}

export function AppLayout() {
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  const isAdmin = user?.role === 'Admin';
  const roleLabel = isAdmin ? 'Administrateur' : user?.role ?? 'Utilisateur';
  const primaryNavItems = isAdmin
    ? [
        { to: '/admin', label: 'Utilisateurs' },
        { to: '/admin/notes', label: 'Notes de frais' },
        { to: '/rapports', label: 'Rapports' },
        { to: '/admin/settings', label: 'Parametres' },
      ]
    : [
        { to: '/', label: 'Dashboard' },
        { to: '/notes', label: 'Notes de frais' },
        ...(user?.role === 'Manager' ? [{ to: '/manager/users', label: 'Utilisateurs' }] : []),
        ...(user?.role === 'RH' ? [{ to: '/rapports', label: 'Rapports' }] : []),
      ];
  const pageTitle = isAdmin
    ? location.pathname === '/profil'
      ? 'Profil utilisateur'
      : location.pathname === '/admin/notes'
      ? 'Administration des notes de frais'
      : location.pathname === '/admin/settings'
      ? 'Parametres de l application'
      : 'Administration des utilisateurs'
    : location.pathname === '/profil'
      ? 'Profil utilisateur'
    : location.pathname === '/manager/users'
      ? 'Gestion des utilisateurs'
    : location.pathname.startsWith('/rapports')
      ? 'Rapports personnalises'
      : 'Gestion des notes de frais';

  useEffect(() => {
    if (isAdmin) {
      setCount(0);
      setItems([]);
      setNotificationsLoaded(false);
      return;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!user || isAdmin) {
      return;
    }

    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const runPrefetch = () => {
      void prefetchDashboard(user);
      void prefetchNotesList(user);
      void prefetchCategories();
      prefetchNotificationsPreview(user);
    };

    const schedule = browserWindow.requestIdleCallback
      ? { type: 'idle' as const, id: browserWindow.requestIdleCallback(runPrefetch, { timeout: 1500 }) }
      : { type: 'timeout' as const, id: browserWindow.setTimeout(runPrefetch, 250) };

    return () => {
      if (schedule.type === 'timeout') {
        browserWindow.clearTimeout(schedule.id);
        return;
      }

      browserWindow.cancelIdleCallback?.(schedule.id);
    };
  }, [isAdmin, user]);

  const fetchNotifications = async () => {
    const cached = readCache<NotificationPreviewResponse>(getNotificationsPreviewCacheKey());
    if (cached) {
      setCount(cached.unread_count);
      setItems(cached.items);
      setNotificationsLoaded(true);
      void api.get<NotificationPreviewResponse>('/notifications/apercu').then(({ data }) => {
        setCount(data.unread_count);
        setItems(data.items);
        cacheNotificationsPreview(data);
      }).catch(() => undefined);
      return;
    }

    const { data } = await api.get<NotificationPreviewResponse>('/notifications/apercu');

    setCount(data.unread_count);
    setItems(data.items);
    cacheNotificationsPreview(data);
    setNotificationsLoaded(true);
  };

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openNotification = async (notification: NotificationItem) => {
    const previousItems = items;
    const previousCount = count;

    if (!notification.est_lue) {
      const nextItems = items.map((item) => (item.id === notification.id ? { ...item, est_lue: true } : item));
      const nextCount = Math.max(0, count - 1);
      setItems(nextItems);
      setCount(nextCount);
      cacheNotificationsPreview({
        unread_count: nextCount,
        items: nextItems,
      });

      const cachedList = readCache<NotificationItem[]>(getNotificationsListCacheKey());
      if (cachedList) {
        cacheNotificationsList(cachedList.map((item) => (item.id === notification.id ? { ...item, est_lue: true } : item)));
      }

      try {
        await api.patch(`/notifications/${notification.id}/lue`);
      } catch {
        setItems(previousItems);
        setCount(previousCount);
        cacheNotificationsPreview({
          unread_count: previousCount,
          items: previousItems,
        });
      }
    }

    const noteId = notification.data?.note_id;
    if (noteId) navigate(`/notes/${noteId}`);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div>
            <h2>GNF</h2>
          </div>
        </div>

        <div className="sidebar-user-card">
          <p>{user?.nom}</p>
          <span className="sidebar-role">{roleLabel}</span>
        </div>

        <div className="sidebar-admin-nav">
          <div className="sidebar-section">
            <nav>
              {primaryNavItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="sidebar-admin-footer">
            <NavLink to="/profil" onClick={() => setMenuOpen(false)}>Profil</NavLink>
            <button onClick={onLogout}>Se deconnecter</button>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="topbar-heading">
            <button className="menu-toggle" onClick={() => setMenuOpen((current) => !current)} aria-expanded={menuOpen} aria-label="Ouvrir le menu">
              Menu
            </button>
            <span className="topbar-kicker">{roleLabel}</span>
            <h1>{pageTitle}</h1>
            {isImpersonating && <button className="secondary" onClick={stopImpersonation}>Quitter l impersonation</button>}
          </div>
          <div className="topbar-actions">
            <div className="topbar-user-pill">
              <strong>{user?.nom}</strong>
              <span>{roleLabel}</span>
            </div>
            {!isAdmin && (
              <div className="notif-wrap">
                <button
                  onClick={() => {
                    const nextOpen = !open;
                    setOpen(nextOpen);
                    if (nextOpen && !notificationsLoaded) {
                      void fetchNotifications();
                    }
                  }}
                  className="notif-btn"
                >
                  <Bell />
                  {count > 0 && <span className="badge">{count}</span>}
                </button>
                {open && (
                  <div className="notif-dropdown">
                    {items.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => void openNotification(n)}
                        className="notif-item"
                      >
                        <strong>{n.titre}</strong>
                        <small>{n.message}</small>
                      </button>
                    ))}
                    <NavLink to="/notifications" onClick={() => setOpen(false)}>Voir tout</NavLink>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
