import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { NoteDeFrais } from '../types';
import { readCache, writeCache } from '../utils/queryCache';
import { getStatusLabel } from '../utils/status';
import { DashboardCacheValue, getDashboardCacheKey, prefetchNoteDetail } from '../utils/appData';

interface DashboardOverview {
  summary: {
    total_notes: number;
    notes_en_cours: number;
    notes_en_attente: number;
    notes_remboursees: number;
    total_mois: number;
  };
  recent_notes: NoteDeFrais[];
}

interface RhDashboardResponse {
  summary: DashboardOverview['summary'];
  pending_notes: NoteDeFrais[];
  departements: Array<{ departement: string; montant_total: number }>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [pendingRhNotes, setPendingRhNotes] = useState<NoteDeFrais[]>([]);
  const [departements, setDepartements] = useState<Array<{ departement: string; montant_total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;

    const cacheKey = getDashboardCacheKey(user);
    const cached = readCache<DashboardCacheValue>(cacheKey);

    if (cached) {
      setOverview(cached.overview);
      setPendingRhNotes(cached.pendingRhNotes);
      setDepartements(cached.departements);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (user.role === 'RH') {
        const { data } = await api.get<RhDashboardResponse>('/dashboard/rh-overview');
        const nextOverview = { summary: data.summary, recent_notes: [] };
        setOverview(nextOverview);
        setPendingRhNotes(data.pending_notes);
        setDepartements(data.departements);
        writeCache(cacheKey, {
          overview: nextOverview,
          pendingRhNotes: data.pending_notes,
          departements: data.departements,
        });
        return;
      }

      const { data } = await api.get<DashboardOverview>('/dashboard/overview');
      setOverview(data);
      writeCache(cacheKey, { overview: data, pendingRhNotes: [], departements: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const reimburseNote = async (note: NoteDeFrais) => {
    const previousNotes = pendingRhNotes;
    const previousOverview = overview;
    const cacheKey = user ? getDashboardCacheKey(user) : null;

    const nextNotes = pendingRhNotes.filter((item) => item.id !== note.id);
    const nextOverview = overview
      ? {
          ...overview,
          summary: {
            ...overview.summary,
            notes_remboursees: overview.summary.notes_remboursees + 1,
            notes_en_attente: Math.max(0, overview.summary.notes_en_attente - 1),
          },
        }
      : overview;

    setPendingRhNotes(nextNotes);
    setOverview(nextOverview);

    if (cacheKey && nextOverview) {
      writeCache(cacheKey, {
        overview: nextOverview,
        pendingRhNotes: nextNotes,
        departements,
      });
    }

    try {
      await api.post(`/notes-de-frais/${note.id}/changer-statut`, {
        action: 'rembourse',
        mode_remboursement: 'virement_salaire',
        paiement_effectue_le: new Date().toISOString().slice(0, 10),
      });
      toast.success('Remboursement valide');
    } catch {
      setPendingRhNotes(previousNotes);
      setOverview(previousOverview);
      if (cacheKey && previousOverview) {
        writeCache(cacheKey, {
          overview: previousOverview,
          pendingRhNotes: previousNotes,
          departements,
        });
      }
      toast.error('Le remboursement a echoue.');
    }
  };

  const refuseNote = async (note: NoteDeFrais) => {
    const commentaire = window.prompt('Motif de refus obligatoire');
    if (!commentaire) {
      toast.error('Le motif est obligatoire.');
      return;
    }

    const previousNotes = pendingRhNotes;
    const previousOverview = overview;
    const cacheKey = user ? getDashboardCacheKey(user) : null;

    const nextNotes = pendingRhNotes.filter((item) => item.id !== note.id);
    const nextOverview = overview
      ? {
          ...overview,
          summary: {
            ...overview.summary,
            notes_en_attente: Math.max(0, overview.summary.notes_en_attente - 1),
          },
        }
      : overview;

    setPendingRhNotes(nextNotes);
    setOverview(nextOverview);

    if (cacheKey && nextOverview) {
      writeCache(cacheKey, {
        overview: nextOverview,
        pendingRhNotes: nextNotes,
        departements,
      });
    }

    try {
      await api.post(`/notes-de-frais/${note.id}/changer-statut`, {
        action: 'refuse',
        commentaire,
      });
      toast.success('Note refusee');
    } catch {
      setPendingRhNotes(previousNotes);
      setOverview(previousOverview);
      if (cacheKey && previousOverview) {
        writeCache(cacheKey, {
          overview: previousOverview,
          pendingRhNotes: previousNotes,
          departements,
        });
      }
      toast.error('Le refus a echoue.');
    }
  };

  if (user?.role === 'Admin') {
    return <Navigate to="/admin" replace />;
  }

  const roleLabel = user?.role === 'RH'
    ? 'Centre de validation RH'
    : user?.role === 'Manager'
      ? 'Pilotage de votre equipe'
      : 'Suivi personnel des depenses';

  const summaryCards = user?.role === 'RH'
    ? [
        { label: 'Notes a traiter', value: overview?.summary.notes_en_attente ?? 0, accent: 'urgent' },
        { label: 'Remboursees', value: overview?.summary.notes_remboursees ?? 0, accent: 'dark' },
        { label: 'Total du mois', value: `${(overview?.summary.total_mois ?? 0).toFixed(2)} DH`, accent: 'red' },
        { label: 'Flux global', value: overview?.summary.total_notes ?? 0, accent: 'soft' },
      ]
    : [
        { label: 'Notes en cours', value: overview?.summary.notes_en_cours ?? 0, accent: 'dark' },
        { label: 'En attente', value: overview?.summary.notes_en_attente ?? 0, accent: 'urgent' },
        { label: 'Remboursees', value: overview?.summary.notes_remboursees ?? 0, accent: 'soft' },
        { label: 'Total du mois', value: `${(overview?.summary.total_mois ?? 0).toFixed(2)} DH`, accent: 'red' },
      ];

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">{roleLabel}</p>
          <h2>Bonjour {user?.nom}</h2>
          <p>
            {user?.role === 'RH'
              ? 'Supervisez les demandes validées par les managers, priorisez les remboursements et gardez une lecture rapide par departement.'
              : user?.role === 'Manager'
                ? 'Gardez un oeil sur les notes recentes de votre perimetre et accedez rapidement aux validations en attente.'
                : 'Retrouvez vos depenses recentes, leur statut et le montant traite ce mois-ci dans un espace unique.'}
          </p>
          {!loading && refreshing && <small>Actualisation rapide...</small>}
        </div>
      </div>

      {loading && <div className="card dashboard-empty-state">Chargement du tableau de bord...</div>}

      {!loading && (
        <>
          <div className="dashboard-block">
            <div className="dashboard-block-head">
              <div>
                <p className="dashboard-block-kicker">Vue d ensemble</p>
                <h3>Indicateurs cles</h3>
              </div>
            </div>
            <div className="dashboard-kpi-grid">
              {summaryCards.map((card) => (
                <article key={card.label} className={`dashboard-kpi-card dashboard-kpi-${card.accent}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>
          </div>

          {user?.role === 'RH' ? (
            <div className="dashboard-block">
              <div className="dashboard-block-head">
                <div>
                  <p className="dashboard-block-kicker">Traitement</p>
                  <h3>Organisation des validations RH</h3>
                </div>
              </div>
              <div className="dashboard-rh-layout">
                <div className="card dashboard-table-card">
                  <div className="dashboard-section-head">
                    <div>
                      <p className="dashboard-eyebrow">Priorite du jour</p>
                      <h3>Notes en attente de remboursement</h3>
                    </div>
                    <span className="dashboard-chip">{pendingRhNotes.length} dossiers</span>
                  </div>
                  <div className="table-wrap">
                    <table className="table mobile-cards">
                      <thead>
                        <tr>
                          <th>Employe</th>
                          <th>Mission</th>
                          <th>Montant</th>
                          <th>Date validation manager</th>
                          <th>Manager</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRhNotes.map((note) => (
                          <tr key={note.id}>
                            <td data-label="Employe">{note.employe?.nom ?? note.email_employe}</td>
                            <td data-label="Mission">{note.titre_mission}</td>
                            <td data-label="Montant">{Number(note.total_note).toFixed(2)} DH</td>
                            <td data-label="Validation manager">{note.date_validation_manager ?? '-'}</td>
                            <td data-label="Manager">{note.responsable?.nom ?? note.email_responsable}</td>
                            <td data-label="Actions">
                              <div className="action-row">
                                <Link
                                  to={`/notes/${note.id}`}
                                  className="button-link secondary-button-link"
                                  onMouseEnter={() => void prefetchNoteDetail(note.id)}
                                  onFocus={() => void prefetchNoteDetail(note.id)}
                                >
                                  Examiner
                                </Link>
                                <button onClick={() => reimburseNote(note)}>Valider remboursement</button>
                                <button className="danger" onClick={() => refuseNote(note)}>Refuser</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pendingRhNotes.length === 0 && (
                          <tr>
                            <td colSpan={6}>Aucune note en attente pour le moment.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="dashboard-side-stack">
                  <div className="card dashboard-spotlight-card">
                    <p className="dashboard-eyebrow">Performance</p>
                    <h3>Remboursements traites</h3>
                    <strong>{overview?.summary.notes_remboursees ?? 0}</strong>
                    <p>Montant du mois: {(overview?.summary.total_mois ?? 0).toFixed(2)} DH</p>
                  </div>

                  <div className="card dashboard-table-card">
                    <div className="dashboard-section-head">
                      <div>
                        <p className="dashboard-eyebrow">Vision globale</p>
                        <h3>Repartition par departement</h3>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="table mobile-cards">
                        <thead>
                          <tr>
                            <th>Departement</th>
                            <th>Montant total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departements.map((item) => (
                            <tr key={item.departement}>
                              <td data-label="Departement">{item.departement}</td>
                              <td data-label="Montant total">{Number(item.montant_total).toFixed(2)} DH</td>
                            </tr>
                          ))}
                          {departements.length === 0 && (
                            <tr>
                              <td colSpan={2}>Aucune donnee departementale disponible.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p><Link className="button-link secondary-button-link" to="/rapports">Ouvrir les rapports RH</Link></p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-block">
              <div className="dashboard-block-head">
                <div>
                  <p className="dashboard-block-kicker">Suivi</p>
                  <h3>Vue principale</h3>
                </div>
              </div>
              <div className="dashboard-main-layout">
                <div className="card dashboard-table-card">
                  <div className="dashboard-section-head">
                    <div>
                      <p className="dashboard-eyebrow">Activite recente</p>
                      <h3>Dernieres notes</h3>
                    </div>
                    <span className="dashboard-chip">{overview?.recent_notes.length ?? 0} elements</span>
                  </div>
                  <div className="table-wrap">
                    <table className="table mobile-cards">
                      <thead>
                        <tr>
                          <th>Mission</th>
                          <th>Statut</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.recent_notes ?? []).map((note) => (
                          <tr key={note.id}>
                            <td data-label="Mission">{note.titre_mission}</td>
                            <td data-label="Statut">{getStatusLabel(note.statut)}</td>
                            <td data-label="Total">{Number(note.total_note).toFixed(2)} DH</td>
                            <td data-label="Action">
                              <Link
                                className="button-link secondary-button-link"
                                to={`/notes/${note.id}`}
                                onMouseEnter={() => void prefetchNoteDetail(note.id)}
                                onFocus={() => void prefetchNoteDetail(note.id)}
                              >
                                Voir
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {(overview?.recent_notes ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4}>Aucune note recente disponible.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>

              <div className="dashboard-side-stack">
                  <div className="card dashboard-action-card">
                    <p className="dashboard-eyebrow">Raccourcis</p>
                    <h3>Actions utiles</h3>
                    <div className="dashboard-action-list">
                      <Link className="button-link" to="/notes/nouvelle">Nouvelle note</Link>
                      <Link className="button-link secondary-button-link" to="/notes">Voir toutes les notes</Link>
                      {user?.role === 'Manager' && <Link className="button-link secondary-button-link" to="/manager/users">Gerer les utilisateurs</Link>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
