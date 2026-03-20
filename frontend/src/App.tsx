import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const AppLayout = lazy(() => import('./layouts/AppLayout').then((module) => ({ default: module.AppLayout })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const NotesListPage = lazy(() => import('./pages/notes/NotesListPage').then((module) => ({ default: module.NotesListPage })));
const NoteDetailPage = lazy(() => import('./pages/notes/NoteDetailPage').then((module) => ({ default: module.NoteDetailPage })));
const NoteFormPage = lazy(() => import('./pages/notes/NoteFormPage').then((module) => ({ default: module.NoteFormPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const RapportsPage = lazy(() => import('./pages/rapports/RapportsPage').then((module) => ({ default: module.RapportsPage })));
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((module) => ({ default: module.AdminPage })));
const AdminNotesPage = lazy(() => import('./pages/admin/AdminNotesPage').then((module) => ({ default: module.AdminNotesPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })));
const ManagerUsersPage = lazy(() => import('./pages/manager/ManagerUsersPage').then((module) => ({ default: module.ManagerUsersPage })));

function AppLoading() {
  return <div className="card auth-card" style={{ maxWidth: 560, margin: '40px auto' }}>Chargement...</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/profil" element={<ProfilePage />} />
                <Route path="/notes" element={<NotesListPage />} />
                <Route path="/notes/nouvelle" element={<NoteFormPage />} />
                <Route path="/notes/:id" element={<NoteDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/rapports" element={<RapportsPage />} />
                <Route path="/manager/users" element={<ManagerUsersPage />} />
                <Route path="/admin/notes" element={<AdminNotesPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
