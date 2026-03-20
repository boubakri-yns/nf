import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { getMockManagedUsers } from '../../api/localApi';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';
import { readCache, writeCache } from '../../utils/queryCache';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const defaultUserForm = {
  nom: '',
  email: '',
  matricule: '',
  departement: '',
  password: '',
  password_confirmation: '',
  active: true,
};

export function ManagerUsersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [filters, setFilters] = useState({
    search: '',
    active: '',
  });
  const debouncedFilters = useDebouncedValue(filters, 300);

  const activeCount = users.filter((item) => item.active !== false).length;
  const inactiveCount = users.filter((item) => item.active === false).length;

  const handleError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      toast.error((error.response?.data as { message?: string } | undefined)?.message ?? fallback);
      return;
    }

    toast.error(fallback);
  };

  const getUsersCacheKey = (nextFilters = filters) => `manager-users:${user?.email ?? 'unknown'}:${JSON.stringify(nextFilters)}`;

  const loadUsers = async (nextFilters = filters) => {
    const cacheKey = getUsersCacheKey(nextFilters);
    const cached = readCache<User[]>(cacheKey);

    if (cached) {
      setUsers(cached);
      setLoading(false);
      setRefreshing(true);
    }

    try {
      const { data } = await api.get<User[]>('/manager/users', {
        params: {
          ...(nextFilters.search.trim() ? { search: nextFilters.search.trim() } : {}),
          ...(nextFilters.active ? { active: nextFilters.active === 'active' } : {}),
        },
      });

      let nextUsers = data;

      // In local testing the backend can be reachable but empty while demo manager
      // accounts already have mock employees configured in the frontend store.
      if (nextUsers.length === 0 && import.meta.env.DEV && user) {
        nextUsers = getMockManagedUsers(user, nextFilters);
      }

      setUsers(nextUsers);
      writeCache(cacheKey, nextUsers);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'Manager') return;

    const run = async () => {
      setLoading(true);
      try {
        await loadUsers();
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    void run();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'Manager') return;
    void loadUsers(debouncedFilters);
  }, [debouncedFilters, user]);

  if (user?.role !== 'Manager') {
    return <Navigate to="/" replace />;
  }

  const resetForm = () => {
    setEditingUserId(null);
    setUserForm(defaultUserForm);
  };

  const saveUser = async () => {
    try {
      const payload = {
        ...userForm,
        departement: userForm.departement || null,
      };

      if (editingUserId) {
        await api.put(`/manager/users/${editingUserId}`, payload);
        toast.success('Collaborateur mis a jour');
      } else {
        await api.post('/manager/users', payload);
        toast.success('Collaborateur cree');
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      handleError(error, "Impossible d'enregistrer ce collaborateur.");
    }
  };

  const toggleUser = async (target: User) => {
    try {
      await api.patch(`/manager/users/${target.id}/active`, { active: !(target.active ?? true) });
      toast.success(target.active === false ? 'Compte reactive' : 'Compte desactive');
      await loadUsers();
    } catch (error) {
      handleError(error, 'Impossible de changer le statut du compte.');
    }
  };

  const editUser = (target: User) => {
    setEditingUserId(target.id);
    setUserForm({
      nom: target.nom,
      email: target.email,
      matricule: target.matricule,
      departement: target.departement ?? '',
      password: '',
      password_confirmation: '',
      active: target.active ?? true,
    });
  };

  return (
    <div className="admin-page">
      <div className="card admin-hero">
        <div>
          <p className="admin-eyebrow">Manager</p>
          <h2>Gestion des utilisateurs</h2>
          <p>Gerez les collaborateurs rattaches a votre equipe.</p>
          {!loading && refreshing && <small style={{ color: 'rgba(255,255,255,0.78)' }}>Actualisation rapide...</small>}
        </div>
        <div className="admin-hero-meta">
          <span className="admin-chip">Total: {users.length}</span>
          <span className="admin-chip">Actifs: {activeCount}</span>
          <span className="admin-chip">Desactives: {inactiveCount}</span>
        </div>
      </div>

      {loading && <div className="card admin-panel">Chargement des collaborateurs...</div>}

      {!loading && (
        <>
          <div className="grid admin-kpi-grid">
            <div className="card admin-kpi-card"><span>Collaborateurs</span><strong>{users.length}</strong></div>
            <div className="card admin-kpi-card"><span>Comptes actifs</span><strong>{activeCount}</strong></div>
            <div className="card admin-kpi-card"><span>Comptes desactives</span><strong>{inactiveCount}</strong></div>
          </div>

          <div className="admin-users-layout">
            <div className="card admin-panel admin-filters-panel">
              <h3>Filtres</h3>
              <input
                placeholder="Recherche nom, email, matricule"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <select value={filters.active} onChange={(event) => setFilters((current) => ({ ...current, active: event.target.value }))}>
                <option value="">Tous les comptes</option>
                <option value="active">Actifs</option>
                <option value="inactive">Desactives</option>
              </select>
              <div className="action-row">
                <button onClick={() => void loadUsers()}>Filtrer</button>
                <button
                  className="secondary"
                  onClick={() => {
                    const cleared = { search: '', active: '' };
                    setFilters(cleared);
                    void loadUsers(cleared);
                  }}
                >
                  Reinitialiser
                </button>
              </div>
            </div>

            <div className="card admin-panel admin-create-user-panel" style={{ gridColumn: 'span 2' }}>
              <h3>{editingUserId ? "Modifier l'utilisateur" : 'Creer un collaborateur'}</h3>
              <input placeholder="Nom" value={userForm.nom} onChange={(event) => setUserForm((current) => ({ ...current, nom: event.target.value }))} />
              <input placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
              <input placeholder="Matricule" value={userForm.matricule} onChange={(event) => setUserForm((current) => ({ ...current, matricule: event.target.value }))} />
              <input placeholder="Departement" value={userForm.departement} onChange={(event) => setUserForm((current) => ({ ...current, departement: event.target.value }))} />
              <input type="password" placeholder={editingUserId ? 'Nouveau mot de passe' : 'Mot de passe'} value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
              <input type="password" placeholder="Confirmation" value={userForm.password_confirmation} onChange={(event) => setUserForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
              <div className="action-row">
                <button onClick={saveUser}>{editingUserId ? 'Mettre a jour' : 'Creer'}</button>
                {editingUserId && <button className="secondary" onClick={resetForm}>Annuler</button>}
              </div>
            </div>
          </div>

          <div className="card admin-panel">
            <h3>Liste de mon equipe</h3>
            <div className="table-wrap">
              <table className="table mobile-cards">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Departement</th>
                    <th>Matricule</th>
                    <th>Etat</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Nom">{item.nom}</td>
                      <td data-label="Email">{item.email}</td>
                      <td data-label="Departement">{item.departement ?? '-'}</td>
                      <td data-label="Matricule">{item.matricule}</td>
                      <td data-label="Etat">{item.active === false ? 'Desactive' : 'Actif'}</td>
                      <td data-label="Actions">
                        <div className="action-row">
                          <button className="secondary" onClick={() => editUser(item)}>Modifier</button>
                          <button className={item.active === false ? '' : 'danger'} onClick={() => void toggleUser(item)}>
                            {item.active === false ? 'Reactiver' : 'Desactiver'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6}>Aucun collaborateur trouve.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
