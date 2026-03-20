import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { getMockNotes, shouldMockImmediately } from '../../api/localApi';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { NoteDeFrais, StatutNote } from '../../types';
import { canUserSeeNote, DashboardCacheValue, defaultNotesFilters, getDashboardCacheKey, getNotesListCacheKey, mergeUniqueNotes, prefetchNoteDetail } from '../../utils/appData';
import { readAllCacheByPrefix, readCache, writeCache } from '../../utils/queryCache';
import { getStatusLabel } from '../../utils/status';

interface NotesApiResponse {
  data?: NoteDeFrais[];
  total?: number;
  current_page?: number;
  last_page?: number;
}

const statusOptions: StatutNote[] = [
  'brouillon',
  'en_attente_responsable',
  'valide_manager',
  'en_attente_rh',
  'valide_rh',
  'valide_paiement',
  'refuse',
  'rembourse',
  'a_corriger',
];

function buildApiFilters(filters: typeof defaultNotesFilters) {
  return {
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.emailEmploye.trim() ? { email_employe: filters.emailEmploye.trim() } : {}),
    ...(filters.emailResponsable.trim() ? { email_responsable: filters.emailResponsable.trim() } : {}),
    ...(filters.departement.trim() ? { departement: filters.departement.trim() } : {}),
    ...(filters.dateDebut ? { date_debut: filters.dateDebut } : {}),
    ...(filters.dateFin ? { date_fin: filters.dateFin } : {}),
    ...(filters.montantMin ? { montant_min: filters.montantMin } : {}),
    ...(filters.montantMax ? { montant_max: filters.montantMax } : {}),
    sort: filters.sort,
    direction: filters.direction,
  };
}

async function fetchAllVisibleNotes(params: Record<string, string>) {
  const firstResponse = await api.get<NotesApiResponse | NoteDeFrais[]>('/notes-de-frais', { params });
  const firstPayload = firstResponse.data;

  if (Array.isArray(firstPayload)) {
    return firstPayload;
  }

  const firstPageNotes = firstPayload.data ?? [];
  const lastPage = firstPayload.last_page ?? 1;

  if (lastPage <= 1) {
    return firstPageNotes;
  }

  const requests: Promise<{ data: NotesApiResponse | NoteDeFrais[] }>[] = [];
  for (let page = 2; page <= lastPage; page += 1) {
    requests.push(api.get<NotesApiResponse | NoteDeFrais[]>('/notes-de-frais', {
      params: { ...params, page: String(page) },
    }));
  }

  const responses = await Promise.all(requests);
  const remainingNotes = responses.flatMap((response) => {
    const payload = response.data;
    return Array.isArray(payload) ? payload : (payload.data ?? []);
  });

  return [...firstPageNotes, ...remainingNotes];
}

export function NotesListPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteDeFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultNotesFilters);
  const debouncedFilters = useDebouncedValue(filters, 250);

  const stats = useMemo(() => {
    const total = notes.reduce((sum, note) => sum + Number(note.total_note ?? 0), 0);
    const pendingStatuses = ['en_attente_responsable', 'en_attente_rh', 'valide_manager', 'valide_rh', 'valide_paiement'];

    return {
      totalNotes: notes.length,
      pendingNotes: notes.filter((note) => pendingStatuses.includes(note.statut)).length,
      reimbursedNotes: notes.filter((note) => note.statut === 'rembourse').length,
      totalAmount: total,
    };
  }, [notes]);

  const fetchNotes = async (nextFilters = filters) => {
    if (!user) {
      return;
    }

    const cacheKey = getNotesListCacheKey(user, nextFilters);
    const cached = readCache<NoteDeFrais[]>(cacheKey);

    setError(null);

    if (cached) {
      setNotes(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    try {
      const params = buildApiFilters(nextFilters);
      const apiNotes = await fetchAllVisibleNotes(params);
      const listCacheNotes = readCache<NoteDeFrais[]>(cacheKey) ?? [];
      const dashboardCache = readCache<DashboardCacheValue>(getDashboardCacheKey(user));
      const dashboardNotes = dashboardCache?.overview?.recent_notes ?? [];
      const detailCacheNotes = readAllCacheByPrefix<NoteDeFrais>('notes:detail:')
        .filter((note) => canUserSeeNote(user.role, user.email, note));
      let nextNotes = mergeUniqueNotes(apiNotes, listCacheNotes, dashboardNotes, detailCacheNotes);

      if (nextNotes.length === 0 && shouldMockImmediately(localStorage.getItem('token'))) {
        nextNotes = getMockNotes(user, params);
      }

      setNotes(nextNotes);
      writeCache(cacheKey, nextNotes);
    } catch {
      setNotes([]);
      setError('Les notes n ont pas pu etre chargees depuis la source active.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchNotes(filters);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchNotes(debouncedFilters);
  }, [debouncedFilters, user]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = async () => {
    const nextFilters = { ...defaultNotesFilters };
    setFilters(nextFilters);
    await fetchNotes(nextFilters);
  };

  if (!user) {
    return null;
  }

  return (
    <section className="admin-notes-shell">
      <div className="card admin-notes-toolbar">
        <div className="admin-notes-toolbar-title">
          <h3>Filtres de recherche</h3>
        </div>
        <form onSubmit={(event) => event.preventDefault()} className="form-grid">
          <input
            placeholder="Recherche mission, email, matricule"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
          />
          <select value={filters.statut} onChange={(event) => setFilter('statut', event.target.value)}>
            <option value="">Tous statuts</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{getStatusLabel(status)}</option>
            ))}
          </select>
          {user.role !== 'Employe' && (
            <input
              placeholder="Email employe"
              value={filters.emailEmploye}
              onChange={(event) => setFilter('emailEmploye', event.target.value)}
            />
          )}
          {(user.role === 'RH' || user.role === 'Admin') && (
            <input
              placeholder="Email manager"
              value={filters.emailResponsable}
              onChange={(event) => setFilter('emailResponsable', event.target.value)}
            />
          )}
          {user.role !== 'Employe' && (
            <input
              placeholder="Departement"
              value={filters.departement}
              onChange={(event) => setFilter('departement', event.target.value)}
            />
          )}
          <input type="date" value={filters.dateDebut} onChange={(event) => setFilter('dateDebut', event.target.value)} />
          <input type="date" value={filters.dateFin} onChange={(event) => setFilter('dateFin', event.target.value)} />
          <input type="number" step="0.01" placeholder="Montant min" value={filters.montantMin} onChange={(event) => setFilter('montantMin', event.target.value)} />
          <input type="number" step="0.01" placeholder="Montant max" value={filters.montantMax} onChange={(event) => setFilter('montantMax', event.target.value)} />
          <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="date_creation">Date</option>
            <option value="total_note">Montant</option>
            <option value="email_employe">Employe</option>
            <option value="titre_mission">Mission</option>
            <option value="statut">Statut</option>
          </select>
          <select value={filters.direction} onChange={(event) => setFilter('direction', event.target.value)}>
            <option value="desc">Descendant</option>
            <option value="asc">Ascendant</option>
          </select>
          <div className="action-row">
            <button type="button" onClick={() => void fetchNotes(filters)}>Filtrer</button>
            <button type="button" className="secondary" onClick={() => void resetFilters()}>Reinitialiser</button>
            {user.role === 'Employe' && <Link to="/notes/nouvelle" className="button-link">Nouvelle note</Link>}
          </div>
        </form>
      </div>

      <div className="card admin-notes-stats compact">
        <h3>Vue rapide</h3>
        <div className="admin-notes-stats-grid">
          <div><span>Total notes</span><strong>{stats.totalNotes}</strong></div>
          <div><span>En attente</span><strong>{stats.pendingNotes}</strong></div>
          <div><span>Remboursees</span><strong>{stats.reimbursedNotes}</strong></div>
          <div><span>Montant total</span><strong>{stats.totalAmount.toFixed(2)} DH</strong></div>
        </div>
      </div>

      <div className="card compact admin-notes-table-card">
        <div className="admin-notes-table-header">
          <h3>Liste des notes de frais</h3>
          <div className="action-row">
            {!loading && refreshing && <span>Actualisation rapide...</span>}
          </div>
        </div>

        {error && <div className="report-error-banner">{error}</div>}
        {loading && <p>Chargement des notes...</p>}

        {!loading && (
          <div className="table-wrap">
            <table className="table mobile-cards">
              <thead>
                <tr>
                  <th>Mission</th>
                  {user.role !== 'Employe' && <th>Employe</th>}
                  {(user.role === 'RH' || user.role === 'Admin') && <th>Manager</th>}
                  <th>Statut</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id}>
                    <td data-label="Mission">{note.titre_mission}</td>
                    {user.role !== 'Employe' && <td data-label="Employe">{note.employe?.nom ?? note.email_employe}</td>}
                    {(user.role === 'RH' || user.role === 'Admin') && <td data-label="Manager">{note.responsable?.nom ?? note.email_responsable}</td>}
                    <td data-label="Statut">{getStatusLabel(note.statut)}</td>
                    <td data-label="Total">{Number(note.total_note).toFixed(2)} DH</td>
                    <td data-label="Date">{note.date_creation}</td>
                    <td data-label="Action">
                      <Link
                        to={`/notes/${note.id}`}
                        onMouseEnter={() => void prefetchNoteDetail(note.id)}
                        onFocus={() => void prefetchNoteDetail(note.id)}
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
                {notes.length === 0 && (
                  <tr>
                    <td colSpan={user.role === 'RH' || user.role === 'Admin' ? 7 : user.role !== 'Employe' ? 6 : 5}>
                      Aucune note trouvee pour cette vue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
