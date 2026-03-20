import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { RegistrationRequest, User } from '../../types';
import { readCache, writeCache } from '../../utils/queryCache';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const defaultUserForm = {
  nom: '',
  email: '',
  matricule: '',
  role: 'Employe' as User['role'],
  email_responsable: '',
  departement: '',
  password: '',
  password_confirmation: '',
  active: true,
};

export function AdminPage() {
  const { user, startImpersonation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    active: '',
  });
  const debouncedFilters = useDebouncedValue(filters, 300);

  const managers = users.filter((item) => item.role === 'Manager' && item.active !== false);
  const employeesCount = users.filter((item) => item.role === 'Employe').length;
  const managersCount = users.filter((item) => item.role === 'Manager').length;
  const rhCount = users.filter((item) => item.role === 'RH').length;
  const activeCount = users.filter((item) => item.active !== false).length;

  const handleError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      toast.error((error.response?.data as { message?: string } | undefined)?.message ?? fallback);
      return;
    }

    toast.error(fallback);
  };

  const getUsersCacheKey = (nextFilters = filters) => `admin-users:${JSON.stringify(nextFilters)}`;
  const getRequestsCacheKey = () => 'admin-registration-requests';

  const loadUsers = async (nextFilters = filters) => {
    const cacheKey = getUsersCacheKey(nextFilters);
    const cached = readCache<User[]>(cacheKey);

    if (cached) {
      setUsers(cached);
      setLoading(false);
      setRefreshing(true);
    }

    try {
      const { data } = await api.get<User[]>('/admin/users', {
        params: {
          ...(nextFilters.search.trim() ? { search: nextFilters.search.trim() } : {}),
          ...(nextFilters.role ? { role: nextFilters.role } : {}),
          ...(nextFilters.active ? { active: nextFilters.active === 'active' } : {}),
        },
      });

      setUsers(data);
      writeCache(cacheKey, data);
    } finally {
      setRefreshing(false);
    }
  };

  const loadRegistrationRequests = async () => {
    const cacheKey = getRequestsCacheKey();
    const cached = readCache<RegistrationRequest[]>(cacheKey);

    if (cached) {
      setRegistrationRequests(cached);
      setLoading(false);
      setRefreshing(true);
      setRequestsError(null);
    }

    try {
      const { data } = await api.get<RegistrationRequest[]>('/admin/registration-requests');
      setRegistrationRequests(data);
      writeCache(cacheKey, data);
      setRequestsError(null);
    } catch (error) {
      setRegistrationRequests([]);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = (error.response?.data as { message?: string } | undefined)?.message;

        if (status === 401 || status === 403) {
          setRequestsError('Reconnectez-vous avec le vrai compte administrateur pour charger les demandes.');
          return;
        }

        setRequestsError(message ?? 'Impossible de charger les demandes d inscription.');
        return;
      }

      setRequestsError('Impossible de charger les demandes d inscription.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'Admin') return;

    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([loadUsers(), loadRegistrationRequests()]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    void run();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    void loadUsers(debouncedFilters);
  }, [debouncedFilters, user]);

  if (user?.role !== 'Admin') {
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
        email_responsable: userForm.role === 'Employe' ? userForm.email_responsable || null : null,
        departement: userForm.departement || null,
      };

      if (editingUserId) {
        await api.put(`/admin/users/${editingUserId}`, payload);
        toast.success('Utilisateur mis a jour');
      } else {
        await api.post('/admin/users', payload);
        toast.success('Utilisateur cree');
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      handleError(error, "Impossible d'enregistrer cet utilisateur.");
    }
  };

  const toggleUser = async (target: User) => {
    try {
      await api.patch(`/admin/users/${target.id}/active`, { active: !(target.active ?? true) });
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
      role: target.role,
      email_responsable: target.email_responsable ?? '',
      departement: target.departement ?? '',
      password: '',
      password_confirmation: '',
      active: target.active ?? true,
    });
  };

  const impersonateUser = async (target: User) => {
    try {
      const { data } = await api.post(`/admin/users/${target.id}/impersonate`);
      startImpersonation(data);
    } catch (error) {
      handleError(error, "Impossible d'ouvrir une session avec cet utilisateur.");
    }
  };

  const deleteUser = async (target: User) => {
    const confirmed = window.confirm(`Supprimer definitivement le compte ${target.nom} (${target.email}) ?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/admin/users/${target.id}`);
      toast.success('Compte supprime');
      await loadUsers();
      await loadRegistrationRequests();
      if (editingUserId === target.id) {
        resetForm();
      }
    } catch (error) {
      handleError(error, 'Suppression impossible.');
    }
  };

  const approveRegistration = async (request: RegistrationRequest) => {
    setBusyRequestId(request.id);
    try {
      await api.post(`/admin/registration-requests/${request.id}/decision`, { action: 'approve' });
      await loadRegistrationRequests();
      await loadUsers();
      toast.success('Demande validee et email envoye.');
    } catch (error) {
      handleError(error, 'Validation impossible.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const rejectRegistration = async (request: RegistrationRequest) => {
    const commentaire = window.prompt('Motif du refus');
    if (!commentaire) {
      toast.error('Le motif est obligatoire.');
      return;
    }

    setBusyRequestId(request.id);
    try {
      await api.post(`/admin/registration-requests/${request.id}/decision`, { action: 'reject', commentaire });
      await loadRegistrationRequests();
      toast.success('Demande refusee et email envoye.');
    } catch (error) {
      handleError(error, 'Refus impossible.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const sendAccessFile = async (request: RegistrationRequest) => {
    setBusyRequestId(request.id);
    try {
      await api.post(`/admin/registration-requests/${request.id}/send-access-file`);
      await loadRegistrationRequests();
      toast.success('Email de connexion envoye.');
    } catch (error) {
      handleError(error, 'Envoi des donnees impossible.');
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="card admin-hero">
        <div>
          <p className="admin-eyebrow">Administration</p>
          <h2>Gestion des utilisateurs</h2>
          <p>L administrateur gere les comptes utilisateurs de l application.</p>
          {!loading && refreshing && <small style={{ color: 'rgba(255,255,255,0.78)' }}>Actualisation rapide...</small>}
        </div>
        <div className="admin-hero-meta">
          <span className="admin-chip">Actifs: {activeCount}</span>
          <span className="admin-chip">Employes: {employeesCount}</span>
          <span className="admin-chip">Managers: {managersCount}</span>
          <span className="admin-chip">RH: {rhCount}</span>
        </div>
      </div>

      {loading && <div className="card admin-panel">Chargement des utilisateurs...</div>}

      {!loading && (
        <>
          <div className="grid admin-kpi-grid">
            <div className="card admin-kpi-card"><span>Comptes actifs</span><strong>{activeCount}</strong></div>
            <div className="card admin-kpi-card"><span>Employes</span><strong>{employeesCount}</strong></div>
            <div className="card admin-kpi-card"><span>Managers</span><strong>{managersCount}</strong></div>
            <div className="card admin-kpi-card"><span>RH</span><strong>{rhCount}</strong></div>
          </div>

          <div className="admin-users-layout">
            <div className="card admin-panel admin-filters-panel">
              <h3>Filtres</h3>
              <input
                placeholder="Recherche nom, email, matricule"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
                <option value="">Tous les roles</option>
                <option value="Employe">Employe</option>
                <option value="Manager">Manager</option>
                <option value="RH">RH</option>
              </select>
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
                    const cleared = { search: '', role: '', active: '' };
                    setFilters(cleared);
                    void loadUsers(cleared);
                  }}
                >
                  Reinitialiser
                </button>
              </div>
            </div>

            <div className="card admin-panel admin-requests-panel">
              <h3>Demandes d inscription</h3>
              <div className="table-wrap">
                <table className="table mobile-cards">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Manager</th>
                      <th>Departement</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrationRequests.map((request) => (
                      <tr key={request.id}>
                        <td data-label="Nom">{request.nom}</td>
                        <td data-label="Email">{request.email}</td>
                        <td data-label="Manager">{request.email_responsable}</td>
                        <td data-label="Departement">{request.departement}</td>
                        <td data-label="Statut">{request.statut}</td>
                        <td data-label="Actions">
                          <div className="action-row">
                            <button className="secondary" onClick={() => void sendAccessFile(request)} disabled={busyRequestId === request.id || request.statut !== 'validee'}>
                              Renvoyer les donnees
                            </button>
                            {request.statut === 'en_attente' && (
                              <>
                                <button onClick={() => void approveRegistration(request)} disabled={busyRequestId === request.id}>Valider et envoyer</button>
                                <button className="danger" onClick={() => void rejectRegistration(request)} disabled={busyRequestId === request.id}>Refuser et envoyer</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {registrationRequests.length === 0 && (
                      <tr>
                        <td colSpan={6}>Aucune demande d inscription.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {requestsError && <div className="report-error-banner" style={{ marginTop: 12 }}>{requestsError}</div>}
              <div className="action-row" style={{ marginTop: 12 }}>
                <button className="secondary" onClick={() => void loadRegistrationRequests()}>
                  Actualiser les demandes
                </button>
              </div>
            </div>

            <div className="card admin-panel admin-create-user-panel">
              <h3>{editingUserId ? "Modifier l'utilisateur" : 'Creer un utilisateur'}</h3>
              <input placeholder="Nom" value={userForm.nom} onChange={(event) => setUserForm((current) => ({ ...current, nom: event.target.value }))} />
              <input placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
              <input placeholder="Matricule" value={userForm.matricule} onChange={(event) => setUserForm((current) => ({ ...current, matricule: event.target.value }))} />
              <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as User['role'] }))}>
                <option value="Employe">Employe</option>
                <option value="Manager">Manager</option>
                <option value="RH">RH</option>
              </select>
              <input placeholder="Departement" value={userForm.departement} onChange={(event) => setUserForm((current) => ({ ...current, departement: event.target.value }))} />
              {userForm.role === 'Employe' && (
                <select value={userForm.email_responsable} onChange={(event) => setUserForm((current) => ({ ...current, email_responsable: event.target.value }))}>
                  <option value="">Aucun responsable</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.email}>{manager.nom} ({manager.email})</option>
                  ))}
                </select>
              )}
              <input type="password" placeholder={editingUserId ? 'Nouveau mot de passe' : 'Mot de passe'} value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
              <input type="password" placeholder="Confirmation" value={userForm.password_confirmation} onChange={(event) => setUserForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
              <div className="action-row">
                <button onClick={saveUser}>{editingUserId ? 'Mettre a jour' : 'Creer'}</button>
                {editingUserId && <button className="secondary" onClick={resetForm}>Annuler</button>}
              </div>
            </div>
          </div>

          <div className="card admin-panel">
            <h3>Liste complete des utilisateurs</h3>
            <div className="table-wrap">
              <table className="table mobile-cards">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Departement</th>
                    <th>Responsable</th>
                    <th>Etat</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Nom">{item.nom}</td>
                      <td data-label="Email">{item.email}</td>
                      <td data-label="Role">{item.role}</td>
                      <td data-label="Departement">{item.departement ?? '-'}</td>
                      <td data-label="Responsable">{item.responsable?.nom ?? item.email_responsable ?? '-'}</td>
                      <td data-label="Etat">{item.active === false ? 'Desactive' : 'Actif'}</td>
                      <td data-label="Actions">
                        <div className="action-row admin-user-table-actions">
                          <button className="secondary" onClick={() => editUser(item)}>Modifier</button>
                          <button className="secondary" onClick={() => void impersonateUser(item)}>Se connecter comme</button>
                          <button className={item.active === false ? '' : 'danger'} onClick={() => void toggleUser(item)}>
                            {item.active === false ? 'Reactiver' : 'Desactiver'}
                          </button>
                          <button className="danger" onClick={() => void deleteUser(item)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
