import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CategorieDepense, LigneDepense, NoteDeFrais } from '../../types';
import { invalidateCacheByPrefix, readCache, writeCache } from '../../utils/queryCache';
import { getStatusLabel } from '../../utils/status';
import {
  cacheNoteDetail,
  defaultNotesFilters,
  getCategoriesCacheKey,
  getNoteDetailCacheKey,
  getNotesListCacheKey,
  removeNoteFromCachedCollections,
  syncNoteInCachedCollections,
} from '../../utils/appData';

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<NoteDeFrais | null>(null);
  const [categories, setCategories] = useState<CategorieDepense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<{ titre_mission: string; commentaire_employe: string }>({
    titre_mission: '',
    commentaire_employe: '',
  });
  const [expenseForm, setExpenseForm] = useState({ categorie_id: '', date_depense: new Date().toISOString().slice(0, 10), montant: '', commentaire: '' });
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [rhData, setRhData] = useState<{
    mode_remboursement: 'virement_salaire' | 'virement_bancaire' | 'cheque';
    paiement_effectue_le: string;
  }>({
    mode_remboursement: 'virement_salaire',
    paiement_effectue_le: new Date().toISOString().slice(0, 10),
  });
  const expenseItems = note?.lignesDepense ?? note?.lignes_depense ?? [];

  const applyNoteData = (noteData: NoteDeFrais) => {
    setNote(noteData);
    cacheNoteDetail(noteData);
    setNoteForm({
      titre_mission: noteData.titre_mission,
      commentaire_employe: noteData.commentaire_employe ?? '',
    });
    setRhData((current) => ({
      ...current,
      mode_remboursement: noteData.mode_remboursement ?? 'virement_salaire',
      paiement_effectue_le: noteData.paiement_effectue_le ?? new Date().toISOString().slice(0, 10),
    }));
  };

  const loadNote = async () => {
    const { data } = await api.get<NoteDeFrais>(`/notes-de-frais/${id}`);
    applyNoteData(data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!user || !id) {
        return;
      }

      setLoading(true);
      setLoadError(null);

      const noteCache = readCache<NoteDeFrais>(getNoteDetailCacheKey(id));
      const listCache = readCache<NoteDeFrais[]>(getNotesListCacheKey(user, defaultNotesFilters));
      const cachedNote = noteCache ?? listCache?.find((item) => String(item.id) === String(id));
      if (cachedNote) {
        applyNoteData(cachedNote);
        setLoading(false);
        setRefreshing(true);
      }

      try {
        const requests: Array<Promise<unknown>> = [loadNote()];
        const cachedCategories = readCache<CategorieDepense[]>(getCategoriesCacheKey());
        if (cachedCategories) {
          setCategories(cachedCategories);
        } else if (categories.length === 0) {
          requests.push(
            api.get<CategorieDepense[]>('/categories-depense').then(({ data }) => {
              setCategories(data);
              writeCache(getCategoriesCacheKey(), data, 5 * 60_000);
            })
          );
        }

        await Promise.all(requests);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setLoadError((error.response?.data as { message?: string } | undefined)?.message ?? 'Impossible de charger cette note.');
        } else {
          setLoadError('Impossible de charger cette note.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    void bootstrap();
  }, [id, user]);

  const canEdit = useMemo(() => user?.role === 'Employe' && ['brouillon', 'a_corriger'].includes(note?.statut ?? ''), [note, user]);
  const canDelete = canEdit && note?.statut === 'brouillon';
  const canApproveAsManager = user?.role === 'Manager' && note?.statut === 'en_attente_responsable';
  const canRhValidate = user?.role === 'RH' && ['en_attente_rh', 'valide_manager'].includes(note?.statut ?? '');
  const canRhPay = user?.role === 'RH' && ['en_attente_rh', 'valide_manager', 'valide_rh', 'valide_paiement'].includes(note?.statut ?? '');
  const canRhArchive = user?.role === 'RH' && note?.statut === 'rembourse' && !note?.archived_at;
  const managerComments = useMemo(
    () => (note?.historique ?? []).filter((item) => item.validateur_email === note?.email_responsable && item.commentaire),
    [note]
  );
  const receiptPreviewUrl = useMemo(() => {
    if (!receiptFile || receiptFile.type === 'application/pdf') return null;
    return URL.createObjectURL(receiptFile);
  }, [receiptFile]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  const dropzone = useDropzone({
    onDrop: (acceptedFiles) => setReceiptFile(acceptedFiles[0] ?? null),
    maxFiles: 1,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'], 'application/pdf': ['.pdf'] },
  });

  const saveNote = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyAction('save-note');
    try {
      const { data } = await api.put<NoteDeFrais>(`/notes-de-frais/${id}`, {
        titre_mission: noteForm.titre_mission,
        commentaire_employe: noteForm.commentaire_employe,
      });
      applyNoteData(data);
      syncNoteInCachedCollections(data);
      toast.success('Note mise a jour');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast.error("Cette note n'est plus modifiable. Elle a probablement deja ete soumise.");
        } else {
          toast.error((error.response?.data as { message?: string } | undefined)?.message ?? 'La mise a jour a echoue.');
        }
      } else {
        toast.error('La mise a jour a echoue.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({ categorie_id: '', date_depense: new Date().toISOString().slice(0, 10), montant: '', commentaire: '' });
    setReceiptFile(null);
  };

  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyAction('save-expense');
    const data = new FormData();
    data.append('categorie_id', expenseForm.categorie_id);
    data.append('date_depense', expenseForm.date_depense);
    data.append('montant', expenseForm.montant);
    data.append('commentaire', expenseForm.commentaire);
    if (receiptFile) data.append('justificatif', receiptFile);

    try {
      if (editingExpenseId) {
        const response = await api.post<NoteDeFrais>(`/lignes-depense/${editingExpenseId}?_method=PUT`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        applyNoteData(response.data);
        syncNoteInCachedCollections(response.data);
        toast.success('Depense modifiee');
      } else {
        const response = await api.post<NoteDeFrais>(`/notes-de-frais/${id}/lignes`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        applyNoteData(response.data);
        syncNoteInCachedCollections(response.data);
        toast.success('Depense ajoutee');
      }
      resetExpenseForm();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error((error.response?.data as { message?: string } | undefined)?.message ?? "L'ajout de la depense a echoue.");
      } else {
        toast.error("L'ajout de la depense a echoue.");
      }
    } finally {
      setBusyAction(null);
    }
  };

  const editExpense = (expense: LigneDepense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      categorie_id: String(expense.categorie_id),
      date_depense: expense.date_depense,
      montant: String(expense.montant),
      commentaire: expense.commentaire ?? '',
    });
    setReceiptFile(null);
  };

  const deleteExpense = async (expenseId: number) => {
    if (!window.confirm('Supprimer cette depense ?')) return;
    setBusyAction(`delete-expense-${expenseId}`);
    try {
      const { data } = await api.delete<NoteDeFrais>(`/lignes-depense/${expenseId}`);
      applyNoteData(data);
      syncNoteInCachedCollections(data);
      toast.success('Depense supprimee');
    } finally {
      setBusyAction(null);
    }
  };

  const submitNote = async () => {
    if (!note) return;

    const previousNote = note;
    const optimisticNote: NoteDeFrais = {
      ...note,
      statut: 'en_attente_responsable',
      date_soumission: new Date().toISOString(),
    };

    setBusyAction('submit-note');
    applyNoteData(optimisticNote);
    try {
      const { data } = await api.post<NoteDeFrais>(`/notes-de-frais/${id}/soumettre`);
      applyNoteData(data);
      syncNoteInCachedCollections(data);
      invalidateCacheByPrefix('notifications:');
      toast.success('Note soumise');
    } catch (error) {
      applyNoteData(previousNote);
      if (axios.isAxiosError(error)) {
        toast.error((error.response?.data as { message?: string } | undefined)?.message ?? 'La soumission a echoue.');
      } else {
        toast.error('La soumission a echoue.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const changeStatus = async (action: 'approuve_manager' | 'approuve_rh' | 'refuse' | 'demande_correction' | 'rembourse' | 'archiver') => {
    if (!note) return;

    const needsComment = action === 'refuse' || action === 'demande_correction';
    const commentaire = needsComment ? window.prompt('Commentaire obligatoire') || undefined : undefined;
    if (needsComment && !commentaire) {
      toast.error('Un commentaire est obligatoire.');
      return;
    }

    const payload: Record<string, unknown> = { action, commentaire };
    if (action === 'rembourse') {
      payload.mode_remboursement = rhData.mode_remboursement;
      payload.paiement_effectue_le = rhData.paiement_effectue_le;
    }

    const previousNote = note;
    const nextStatus = action === 'approuve_manager'
      ? 'en_attente_rh'
      : action === 'approuve_rh'
        ? 'valide_paiement'
        : action === 'demande_correction'
          ? 'a_corriger'
          : action === 'refuse'
            ? 'refuse'
            : 'rembourse';

    const optimisticNote: NoteDeFrais = {
      ...note,
      statut: nextStatus,
      archived_at: action === 'archiver' ? new Date().toISOString() : note.archived_at,
      mode_remboursement: action === 'rembourse' ? rhData.mode_remboursement : note.mode_remboursement,
      paiement_effectue_le: action === 'rembourse' ? rhData.paiement_effectue_le : note.paiement_effectue_le,
    };

    setBusyAction(action);
    applyNoteData(optimisticNote);
    try {
      const { data } = await api.post<NoteDeFrais>(`/notes-de-frais/${id}/changer-statut`, payload);
      applyNoteData(data);
      syncNoteInCachedCollections(data);
      invalidateCacheByPrefix('notifications:');
      toast.success('Statut mis a jour');
    } catch (error) {
      applyNoteData(previousNote);
      if (axios.isAxiosError(error)) {
        toast.error((error.response?.data as { message?: string } | undefined)?.message ?? 'La mise a jour du statut a echoue.');
      } else {
        toast.error('La mise a jour du statut a echoue.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const deleteNote = async () => {
    if (!window.confirm('Supprimer cette note ?')) return;
    setBusyAction('delete-note');
    try {
      await api.delete(`/notes-de-frais/${id}`);
      removeNoteFromCachedCollections(Number(id));
      invalidateCacheByPrefix('notifications:');
      toast.success('Note supprimee');
      navigate('/notes');
    } finally {
      setBusyAction(null);
    }
  };

  const downloadReceipt = async (expenseId: number) => {
    setBusyAction(`download-${expenseId}`);
    try {
      const response = await api.get(`/lignes-depense/${expenseId}/justificatif`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } finally {
      setBusyAction(null);
    }
  };

  const downloadReimbursementDocument = async () => {
    setBusyAction('download-reimbursement');
    try {
      const response = await api.get(`/notes-de-frais/${id}/document-remboursement`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) return <div className="card">Chargement...</div>;
  if (loadError || !note) return <div className="card">{loadError ?? 'Note introuvable.'}</div>;

  return (
    <>
      <div className="card">
        <h2>{note.titre_mission}</h2>
        {refreshing && <small>Actualisation rapide...</small>}
        <p>Statut: <strong>{getStatusLabel(note.statut)}</strong></p>
        <p>Total automatique: {Number(note.total_note).toFixed(2)} DH</p>
        <p>Employe: {note.employe?.nom ?? note.email_employe}</p>
        <p>Manager: {note.responsable?.nom ?? note.email_responsable}</p>
        {note.archived_at && <p>Archivee le: {note.archived_at}</p>}
        {note.reference_comptable && <p>Reference comptable: {note.reference_comptable}</p>}
        {note.mode_remboursement && <p>Mode de remboursement: {note.mode_remboursement}</p>}
        {note.document_remboursement_path && (
          <div className="action-row">
            <button className="secondary" onClick={downloadReimbursementDocument} disabled={busyAction !== null}>
              Consulter le document de remboursement
            </button>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="card">
          <h3>Modifier la note</h3>
          <form onSubmit={saveNote}>
            <input value={noteForm.titre_mission} onChange={(event) => setNoteForm({ ...noteForm, titre_mission: event.target.value })} required />
            <textarea value={noteForm.commentaire_employe} onChange={(event) => setNoteForm({ ...noteForm, commentaire_employe: event.target.value })} />
            <div className="action-row">
              <button type="submit" disabled={busyAction !== null}>Enregistrer</button>
              <button
                type="button"
                className="secondary"
                onClick={submitNote}
                disabled={busyAction !== null}
              >
                Passer en attente responsable
              </button>
              {canDelete && <button type="button" className="danger" onClick={deleteNote} disabled={busyAction !== null}>Supprimer</button>}
            </div>
            <small>Ajoutez au moins une depense avant soumission au responsable.</small>
          </form>
        </div>
      )}

      <div className="card">
        <h3>{editingExpenseId ? 'Modifier une depense' : 'Ajouter une depense'}</h3>
        {canEdit && (
          <form onSubmit={saveExpense}>
            <select value={expenseForm.categorie_id} onChange={(event) => setExpenseForm({ ...expenseForm, categorie_id: event.target.value })} required>
              <option value="">Categorie</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.nom}</option>)}
            </select>
            <input type="date" value={expenseForm.date_depense} onChange={(event) => setExpenseForm({ ...expenseForm, date_depense: event.target.value })} required />
            <input type="number" step="0.01" value={expenseForm.montant} onChange={(event) => setExpenseForm({ ...expenseForm, montant: event.target.value })} required />
            <textarea value={expenseForm.commentaire} onChange={(event) => setExpenseForm({ ...expenseForm, commentaire: event.target.value })} placeholder="Commentaire" />
            <div {...dropzone.getRootProps()} style={{ border: '2px dashed #a3a3a3', padding: 20, borderRadius: 8, marginBottom: 10 }}>
              <input {...dropzone.getInputProps()} capture="environment" />
              <p>Photo ou PDF du justificatif.</p>
              <small>Formats acceptes: .jpg, .jpeg, .png, .pdf</small>
              <br />
              <small>Le justificatif peut etre obligatoire selon la categorie ou si le montant atteint le seuil defini.</small>
              {receiptFile && <small>{receiptFile.name}</small>}
            </div>
            {receiptPreviewUrl && (
              <div className="card" style={{ marginBottom: 10 }}>
                <strong>Apercu avant validation</strong>
                <img src={receiptPreviewUrl} alt="Apercu du justificatif" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', marginTop: 10 }} />
              </div>
            )}
            {receiptFile?.type === 'application/pdf' && (
              <div className="card" style={{ marginBottom: 10 }}>
                <strong>Apercu avant validation</strong>
                <p>PDF selectionne: {receiptFile.name}</p>
              </div>
            )}
            <div className="action-row">
              <button type="submit" disabled={busyAction !== null}>{editingExpenseId ? 'Modifier la depense' : 'Ajouter la depense'}</button>
              {editingExpenseId && <button type="button" className="secondary" onClick={resetExpenseForm}>Annuler</button>}
            </div>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Categorie</th>
              <th>Montant</th>
              <th>Commentaire</th>
              <th>Justificatif</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {expenseItems.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.date_depense}</td>
                <td>{expense.categorie?.nom}</td>
                <td>{Number(expense.montant).toFixed(2)} DH</td>
                <td>{expense.commentaire ?? '-'}</td>
                <td>{expense.justificatif_path ? <button className="secondary" onClick={() => downloadReceipt(expense.id)}>Ouvrir</button> : 'Aucun'}</td>
                {canEdit && (
                  <td>
                    <div className="action-row">
                      <button className="secondary" onClick={() => editExpense(expense)}>Modifier</button>
                      <button className="danger" onClick={() => deleteExpense(expense.id)}>Supprimer</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canApproveAsManager && (
        <div className="card">
          <h3>Decision manager</h3>
          <div className="action-row">
            <button onClick={() => changeStatus('approuve_manager')} disabled={busyAction !== null}>Transmettre aux RH</button>
            <button className="danger" onClick={() => changeStatus('refuse')} disabled={busyAction !== null}>Refuser</button>
            <button className="secondary" onClick={() => changeStatus('demande_correction')} disabled={busyAction !== null}>Retourner pour correction</button>
          </div>
        </div>
      )}

      {canRhValidate && (
        <div className="card">
          <h3>Controle RH</h3>
          <div className="action-row">
            <button onClick={() => changeStatus('rembourse')} disabled={busyAction !== null}>Valider le remboursement</button>
            <button className="danger" onClick={() => changeStatus('refuse')} disabled={busyAction !== null}>Refuser</button>
          </div>
        </div>
      )}

      {!canRhValidate && canRhPay && (
        <div className="card">
          <h3>Paiement</h3>
          <select value={rhData.mode_remboursement} onChange={(event) => setRhData({ ...rhData, mode_remboursement: event.target.value as typeof rhData.mode_remboursement })}>
            <option value="virement_salaire">Virement sur salaire</option>
            <option value="virement_bancaire">Virement bancaire</option>
            <option value="cheque">Cheque</option>
          </select>
          <input type="date" value={rhData.paiement_effectue_le} onChange={(event) => setRhData({ ...rhData, paiement_effectue_le: event.target.value })} />
          <div className="action-row">
            <button onClick={() => changeStatus('rembourse')} disabled={busyAction !== null}>Marquer remboursee</button>
          </div>
        </div>
      )}

      {canRhArchive && (
        <div className="card">
          <h3>Archivage</h3>
          <div className="action-row">
            <button onClick={() => changeStatus('archiver')} disabled={busyAction !== null}>Archiver la note</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Historique</h3>
        <ul>
          {(note.historique ?? []).map((historyItem) => (
            <li key={historyItem.id}>
              {historyItem.action} - {historyItem.validateur?.nom ?? historyItem.validateur_email} - {historyItem.date_decision} {historyItem.commentaire ? `(${historyItem.commentaire})` : ''}
            </li>
          ))}
        </ul>
      </div>

      {user?.role === 'Employe' && managerComments.length > 0 && (
        <div className="card">
          <h3>Commentaires du manager</h3>
          <ul>
            {managerComments.map((comment) => (
              <li key={comment.id}>
                {comment.date_decision}: {comment.commentaire}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
