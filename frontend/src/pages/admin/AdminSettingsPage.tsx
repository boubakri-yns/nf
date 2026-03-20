import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CategorieDepense, ParametreItem } from '../../types';
import { readCache, writeCache } from '../../utils/queryCache';

const defaultCategoryForm = {
  nom: '',
  code: '',
  plafond_journalier: '',
  justificatif_obligatoire: true,
  active: true,
};

const workflowStatuses = [
  { code: 'brouillon', label: 'Brouillon', description: 'Note en preparation par l employe.' },
  { code: 'en_attente_responsable', label: 'En attente responsable', description: 'En attente de validation du responsable.' },
  { code: 'valide_manager', label: 'Valide manager', description: 'Validation manager effectuee, note transmise au RH.' },
  { code: 'en_attente_rh', label: 'En attente RH', description: 'Controle RH en attente.' },
  { code: 'valide_rh', label: 'Valide RH', description: 'Validation RH effectuee.' },
  { code: 'valide_paiement', label: 'Paiement valide', description: 'Paiement prepare ou autorise.' },
  { code: 'rembourse', label: 'Rembourse', description: 'Remboursement effectue.' },
  { code: 'refuse', label: 'Refuse', description: 'Note refusee apres controle.' },
  { code: 'a_corriger', label: 'A corriger', description: 'Retour a l employe pour correction.' },
];

export function AdminSettingsPage() {
  const cacheKey = 'admin:settings';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategorieDepense[]>([]);
  const [parametres, setParametres] = useState<ParametreItem[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);

  const handleError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      toast.error((error.response?.data as { message?: string } | undefined)?.message ?? fallback);
      return;
    }

    toast.error(fallback);
  };

  const loadConfiguration = async () => {
    const cached = readCache<{ categories: CategorieDepense[]; parametres: ParametreItem[] }>(cacheKey);
    if (cached) {
      setCategories(cached.categories);
      setParametres(cached.parametres);
      setLoading(false);
    }

    const [categoriesResponse, parametresResponse] = await Promise.all([
      api.get<CategorieDepense[]>('/categories-depense'),
      api.get<ParametreItem[]>('/admin/parametres'),
    ]);

    setCategories(categoriesResponse.data);
    setParametres(parametresResponse.data);
    writeCache(cacheKey, {
      categories: categoriesResponse.data,
      parametres: parametresResponse.data,
    }, 60_000);
  };

  useEffect(() => {
    if (user?.role !== 'Admin') return;

    const run = async () => {
      setLoading(true);
      try {
        await loadConfiguration();
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user]);

  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  const activeCategoriesCount = categories.filter((item) => item.active).length;

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(defaultCategoryForm);
  };

  const saveCategory = async () => {
    try {
      const payload = {
        ...categoryForm,
        plafond_journalier: categoryForm.plafond_journalier === '' ? null : Number(categoryForm.plafond_journalier),
      };

      if (editingCategoryId) {
        await api.put(`/admin/categories-depense/${editingCategoryId}`, payload);
        toast.success('Categorie mise a jour');
      } else {
        await api.post('/admin/categories-depense', payload);
        toast.success('Categorie creee');
      }

      resetCategoryForm();
      await loadConfiguration();
    } catch (error) {
      handleError(error, "Impossible d'enregistrer cette categorie.");
    }
  };

  const editCategory = (category: CategorieDepense) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      nom: category.nom,
      code: category.code,
      plafond_journalier: category.plafond_journalier ?? '',
      justificatif_obligatoire: category.justificatif_obligatoire,
      active: category.active,
    });
  };

  const disableCategory = async (category: CategorieDepense) => {
    try {
      await api.delete(`/admin/categories-depense/${category.id}`);
      toast.success('Categorie desactivee');
      await loadConfiguration();
    } catch (error) {
      handleError(error, 'Impossible de desactiver cette categorie.');
    }
  };

  const saveParametre = async (parametre: ParametreItem) => {
    try {
      await api.put(`/admin/parametres/${parametre.id}`, {
        valeur: parametre.valeur,
        description: parametre.description ?? '',
      });
      toast.success(`Parametre ${parametre.cle} mis a jour`);
      await loadConfiguration();
    } catch (error) {
      handleError(error, "Impossible d'enregistrer ce parametre.");
    }
  };

  const updateParametreValue = (id: number, valeur: string) => {
    setParametres((current) => current.map((item) => (item.id === id ? { ...item, valeur } : item)));
  };

  return (
    <div className="admin-page">
      <div className="card admin-hero">
        <div>
          <p className="admin-eyebrow">Administration</p>
          <h2>Parametres de l application</h2>
          <p>L administrateur configure ici les seuils, categories de depense et le workflow metier visible dans l application.</p>
        </div>
        <div className="admin-hero-meta">
          <span className="admin-chip">Categories actives: {activeCategoriesCount}</span>
          <span className="admin-chip">Parametres systeme: {parametres.length}</span>
          <span className="admin-chip">Statuts workflow: {workflowStatuses.length}</span>
        </div>
      </div>

      {loading && <div className="card admin-panel">Chargement des parametres...</div>}

      {!loading && (
        <>
          <div className="grid admin-kpi-grid">
            <div className="card admin-kpi-card"><span>Categories actives</span><strong>{activeCategoriesCount}</strong></div>
            <div className="card admin-kpi-card"><span>Parametres systeme</span><strong>{parametres.length}</strong></div>
            <div className="card admin-kpi-card"><span>Statuts workflow</span><strong>{workflowStatuses.length}</strong></div>
          </div>

          <div className="grid admin-two-columns">
            <div className="card admin-panel">
              <h3>Parametres generaux</h3>
              <small>Ces reglages pilotent les seuils, delais et autres comportements globaux de l application.</small>
              <div className="stack">
                {parametres.map((parametre) => (
                  <div key={parametre.id} className="card compact admin-subpanel">
                    <strong>{parametre.cle}</strong>
                    <small>{parametre.description ?? 'Aucune description'}</small>
                    <input
                      value={parametre.valeur}
                      onChange={(event) => updateParametreValue(parametre.id, event.target.value)}
                    />
                    <div className="action-row">
                      <button onClick={() => void saveParametre(parametre)}>Enregistrer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card admin-panel">
              <h3>{editingCategoryId ? 'Modifier une categorie' : 'Ajouter une categorie'}</h3>
              <small>Configure les types de depense disponibles dans l application.</small>
              <input placeholder="Nom" value={categoryForm.nom} onChange={(event) => setCategoryForm((current) => ({ ...current, nom: event.target.value }))} />
              <input placeholder="Code" value={categoryForm.code} onChange={(event) => setCategoryForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
              <input placeholder="Plafond journalier" type="number" min="0" step="0.01" value={categoryForm.plafond_journalier} onChange={(event) => setCategoryForm((current) => ({ ...current, plafond_journalier: event.target.value }))} />
              <select
                value={categoryForm.justificatif_obligatoire ? 'true' : 'false'}
                onChange={(event) => setCategoryForm((current) => ({ ...current, justificatif_obligatoire: event.target.value === 'true' }))}
              >
                <option value="true">Justificatif obligatoire</option>
                <option value="false">Justificatif facultatif</option>
              </select>
              <select
                value={categoryForm.active ? 'true' : 'false'}
                onChange={(event) => setCategoryForm((current) => ({ ...current, active: event.target.value === 'true' }))}
              >
                <option value="true">Categorie active</option>
                <option value="false">Categorie inactive</option>
              </select>
              <div className="action-row">
                <button onClick={saveCategory}>{editingCategoryId ? 'Mettre a jour' : 'Ajouter'}</button>
                {editingCategoryId && <button className="secondary" onClick={resetCategoryForm}>Annuler</button>}
              </div>
            </div>
          </div>

          <div className="card admin-panel">
            <h3>Categories de depense</h3>
            <div className="table-wrap">
              <table className="table mobile-cards">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Plafond</th>
                    <th>Justificatif</th>
                    <th>Etat</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td data-label="Nom">{category.nom}</td>
                      <td data-label="Code">{category.code}</td>
                      <td data-label="Plafond">{category.plafond_journalier ? `${Number(category.plafond_journalier).toFixed(2)} DH` : '-'}</td>
                      <td data-label="Justificatif">{category.justificatif_obligatoire ? 'Obligatoire' : 'Facultatif'}</td>
                      <td data-label="Etat">{category.active ? 'Active' : 'Inactive'}</td>
                      <td data-label="Actions">
                        <div className="action-row">
                          <button className="secondary" onClick={() => editCategory(category)}>Modifier</button>
                          {category.active && <button className="danger" onClick={() => void disableCategory(category)}>Desactiver</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card admin-panel">
            <h3>Statuts du workflow</h3>
            <small>Les statuts ci-dessous correspondent au circuit metier actuel des notes de frais.</small>
            <div className="table-wrap">
              <table className="table mobile-cards">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Libelle</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {workflowStatuses.map((status) => (
                    <tr key={status.code}>
                      <td data-label="Code">{status.code}</td>
                      <td data-label="Libelle">{status.label}</td>
                      <td data-label="Description">{status.description}</td>
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
