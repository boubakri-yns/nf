import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { getMockNotes } from '../../api/localApi';
import { rapportsApi } from '../../api/rapports';
import { useAuth } from '../../context/AuthContext';
import type { NoteDeFrais, ReportFilterResponse } from '../../types';
import { getStatusLabel } from '../../utils/status';
import { canUserSeeNote, mergeUniqueNotes } from '../../utils/appData';
import { readAllCacheByPrefix } from '../../utils/queryCache';

interface NotesApiResponse {
  data?: NoteDeFrais[];
  total?: number;
  current_page?: number;
  last_page?: number;
}

function buildMonthBounds(period: string) {
  if (!period) {
    return { start: '', end: '' };
  }

  const [year, month] = period.split('-').map(Number);
  if (!year || !month) {
    return { start: '', end: '' };
  }

  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${period}-01`,
    end: `${period}-${String(lastDay).padStart(2, '0')}`,
  };
}

function buildMockFilters(period: string, employee: string, status: string) {
  const { start, end } = buildMonthBounds(period);

  return {
    ...(employee ? { email_employe: employee } : {}),
    ...(status ? { statut: status } : {}),
    ...(start ? { date_debut: start } : {}),
    ...(end ? { date_fin: end } : {}),
    sort: 'date_creation',
    direction: 'desc',
  };
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function AdminNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteDeFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterOptions, setFilterOptions] = useState<ReportFilterResponse | null>(null);
  const [filters, setFilters] = useState({
    period: '',
    employee: '',
    status: '',
  });

  const selectedNotes = useMemo(
    () => notes.filter((note) => selectedIds.includes(note.id)),
    [notes, selectedIds],
  );

  const stats = useMemo(() => {
    const pendingStatuses = ['en_attente_responsable', 'en_attente_rh', 'valide_manager', 'valide_rh', 'valide_paiement'];
    const totalAmount = notes.reduce((sum, note) => sum + Number(note.total_note ?? 0), 0);

    return {
      totalNotes: notes.length,
      pendingNotes: notes.filter((note) => pendingStatuses.includes(note.statut)).length,
      reimbursedNotes: notes.filter((note) => note.statut === 'rembourse').length,
      totalAmount,
      averageAmount: notes.length > 0 ? totalAmount / notes.length : 0,
    };
  }, [notes]);

  const fetchFilterOptions = async () => {
    try {
      const data = await rapportsApi.getFiltres();
      setFilterOptions(data);
    } catch {
      setFilterOptions(null);
    }
  };

  const fetchAllNotes = async (params: Record<string, string>) => {
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

    const pageRequests: Promise<{ data: NotesApiResponse | NoteDeFrais[] }>[] = [];
    for (let page = 2; page <= lastPage; page += 1) {
      pageRequests.push(api.get<NotesApiResponse | NoteDeFrais[]>('/notes-de-frais', {
        params: { ...params, page: String(page) },
      }));
    }

    const pageResponses = await Promise.all(pageRequests);
    const remainingNotes = pageResponses.flatMap((response) => {
      const payload = response.data;
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    });

    return [...firstPageNotes, ...remainingNotes];
  };

  const fetchNotes = async (nextFilters = filters) => {
    const { start, end } = buildMonthBounds(nextFilters.period);

    setError(null);
    setRefreshing(true);

    try {
      const params = {
        ...(nextFilters.employee ? { email_employe: nextFilters.employee } : {}),
        ...(nextFilters.status ? { statut: nextFilters.status } : {}),
        ...(start ? { date_debut: start } : {}),
        ...(end ? { date_fin: end } : {}),
        sort: 'date_creation',
        direction: 'desc',
      };
      let nextNotes = await fetchAllNotes(params);
      const detailCacheNotes = user
        ? readAllCacheByPrefix<NoteDeFrais>('notes:detail:').filter((note) => canUserSeeNote(user.role, user.email, note))
        : [];
      nextNotes = mergeUniqueNotes(nextNotes, detailCacheNotes);

      // In local testing, the backend can be empty while the frontend mock store already
      // contains demo notes. Fall back to that dataset so the admin page remains testable.
      if (nextNotes.length === 0 && import.meta.env.DEV && user) {
        nextNotes = getMockNotes(user, buildMockFilters(nextFilters.period, nextFilters.employee, nextFilters.status));
      }

      setNotes(nextNotes);
      setSelectedIds((current) => current.filter((id) => nextNotes.some((note) => note.id === id)));
    } catch {
      setNotes([]);
      setSelectedIds([]);
      setError('Chargement des notes impossible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'Admin') {
      return;
    }

    void Promise.all([fetchFilterOptions(), fetchNotes()]);
  }, [user]);

  if (user?.role !== 'Admin') {
    return <div className="card">Acces reserve a l administrateur.</div>;
  }

  const allVisibleSelected = notes.length > 0 && notes.every((note) => selectedIds.includes(note.id));

  const toggleSelection = (noteId: number) => {
    setSelectedIds((current) => (
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId]
    ));
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => (
      allVisibleSelected ? [] : notes.map((note) => note.id)
    ));
  };

  const exportSelection = () => {
    if (selectedNotes.length === 0) {
      toast.error('Selectionnez au moins une note.');
      return;
    }

    downloadCsv('notes-de-frais-selection.csv', [
      ['ID', 'Employe', 'Email', 'Mission', 'Montant', 'Statut', 'Date'],
      ...selectedNotes.map((note) => [
        String(note.id),
        note.employe?.nom ?? note.email_employe,
        note.email_employe,
        note.titre_mission,
        Number(note.total_note).toFixed(2),
        getStatusLabel(note.statut),
        note.date_creation,
      ]),
    ]);

    toast.success('Export CSV genere.');
  };

  const createNote = async () => {
    const justification = 'Creation admin';

    const employeeEmail = window.prompt('Email employe');
    if (!employeeEmail) {
      return;
    }

    const title = window.prompt('Titre de mission');
    if (!title) {
      return;
    }

    const creationDate = window.prompt('Date de creation (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
    if (!creationDate) {
      return;
    }

    const managerEmail = window.prompt('Email manager (laisser vide pour auto)');
    const commentaire = window.prompt('Commentaire employe') ?? '';

    try {
      await api.post('/admin/notes-de-frais', {
        justification,
        titre_mission: title,
        date_creation: creationDate,
        commentaire_employe: commentaire,
        email_employe: employeeEmail.trim(),
        ...(managerEmail?.trim() ? { email_responsable: managerEmail.trim() } : {}),
      });
      toast.success('Note creee');
      await fetchNotes();
    } catch {
      toast.error('Creation de note impossible.');
    }
  };

  const editNote = async (note: NoteDeFrais) => {
    const title = window.prompt('Titre de mission', note.titre_mission);
    if (!title) {
      return;
    }

    const creationDate = window.prompt('Date de creation (YYYY-MM-DD)', note.date_creation);
    if (!creationDate) {
      return;
    }

    const commentaire = window.prompt('Commentaire employe', note.commentaire_employe ?? '') ?? '';

    try {
      await api.put(`/admin/notes-de-frais/${note.id}`, {
        titre_mission: title,
        date_creation: creationDate,
        commentaire_employe: commentaire,
        email_employe: note.email_employe,
        email_responsable: note.email_responsable,
      });
      toast.success('Note modifiee');
      await fetchNotes();
    } catch {
      toast.error('Modification impossible.');
    }
  };

  const deleteNote = async (note: NoteDeFrais) => {
    if (!window.confirm(`Supprimer la note "${note.titre_mission}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/notes-de-frais/${note.id}`);
      toast.success('Note supprimee');
      await fetchNotes();
    } catch {
      toast.error('Suppression impossible.');
    }
  };

  return (
    <section className="admin-page">
      <div className="card admin-hero">
        <div>
          <p className="admin-eyebrow">Administration</p>
          <h2>Notes de frais</h2>
          <p>L administrateur consulte, filtre et supervise les notes de frais depuis une vue dediee.</p>
          {!loading && refreshing && <small style={{ color: 'rgba(255,255,255,0.78)' }}>Actualisation rapide...</small>}
        </div>
      </div>

      <div className="card admin-panel admin-notes-shell">
        <div className="admin-notes-toolbar">
          <div className="admin-notes-toolbar-title">
            <h3>Filtres avances</h3>
          </div>
          <div className="admin-notes-filter-row">
            <label>
              <span>Periode</span>
              <input
                type="month"
                value={filters.period}
                onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}
              />
            </label>
            <label>
              <span>Employe</span>
              <select
                value={filters.employee}
                onChange={(event) => setFilters((current) => ({ ...current, employee: event.target.value }))}
              >
                <option value="">Tous</option>
                {(filterOptions?.employes ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Statut</span>
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Tous</option>
                {(filterOptions?.statuts ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="action-row">
            <button onClick={() => void fetchNotes()}>Rechercher</button>
            <button
              className="secondary"
              onClick={() => {
                const nextFilters = { period: '', employee: '', status: '' };
                setFilters(nextFilters);
                void fetchNotes(nextFilters);
              }}
            >
              Reinitialiser
            </button>
          </div>
        </div>

        <div className="admin-notes-stats card compact">
          <h3>Statistiques rapides</h3>
          <div className="admin-notes-stats-grid">
            <div><span>Total notes</span><strong>{stats.totalNotes}</strong></div>
            <div><span>En attente</span><strong>{stats.pendingNotes}</strong></div>
            <div><span>Remboursees</span><strong>{stats.reimbursedNotes}</strong></div>
            <div><span>Montant total</span><strong>{stats.totalAmount.toFixed(2)} DH</strong></div>
            <div><span>Montant moyen</span><strong>{stats.averageAmount.toFixed(2)} DH</strong></div>
          </div>
        </div>

        <div className="card compact admin-notes-table-card">
          <div className="admin-notes-table-header">
            <h3>Liste complete des notes</h3>
            <div className="action-row">
              <button onClick={() => void createNote()}>Nouvelle note</button>
              <button className="secondary" onClick={toggleSelectAll}>
                {allVisibleSelected ? 'Tout deselectionner' : 'Tout selectionner'}
              </button>
              <button className="secondary" onClick={exportSelection}>
                Exporter la selection
              </button>
            </div>
          </div>

          {error && <div className="report-error-banner">{error}</div>}
          {loading && <p>Chargement des notes...</p>}

          {!loading && (
            <div className="table-wrap">
              <table className="table mobile-cards">
                <thead>
                  <tr>
                    <th></th>
                    <th>ID</th>
                    <th>Employe</th>
                    <th>Mission</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => (
                    <tr key={note.id}>
                      <td data-label="Selection">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(note.id)}
                          onChange={() => toggleSelection(note.id)}
                        />
                      </td>
                      <td data-label="ID">{note.id}</td>
                      <td data-label="Employe">{note.employe?.nom ?? note.email_employe}</td>
                      <td data-label="Mission">{note.titre_mission}</td>
                      <td data-label="Montant">{Number(note.total_note).toFixed(2)} DH</td>
                      <td data-label="Statut">{getStatusLabel(note.statut)}</td>
                      <td data-label="Actions">
                        <div className="action-row admin-note-actions">
                          <Link className="button-link admin-note-view-link" to={`/notes/${note.id}`}>Voir</Link>
                          <button className="secondary" onClick={() => void editNote(note)}>Modifier</button>
                          <button className="danger" onClick={() => void deleteNote(note)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {notes.length === 0 && (
                    <tr>
                      <td colSpan={7}>Aucune note trouvee.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
