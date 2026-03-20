import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { rapportsApi } from '../../api/rapports';
import type {
  ReportConfigPayload,
  ReportColumnResponse,
  ReportFilterResponse,
  ReportPreviewResponse,
  ReportFiltersState,
  SavedReportConfiguration,
} from '../../types';
import { ApercuTableau } from './components/ApercuTableau';
import { ExportButtons } from './components/ExportButtons';
import { FiltresAvances } from './components/FiltresAvances';
import { SelectionColonnes } from './components/SelectionColonnes';
import { SelectionPeriode } from './components/SelectionPeriode';

const defaultFilters: ReportFiltersState = {
  statuses: [],
  department: '',
  manager: '',
  employee: '',
  amount_min: '',
  amount_max: '',
  note_ids: [],
};

const makeDefaultConfig = (): ReportConfigPayload => {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth() - 2);

  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    columns: [],
    filters: defaultFilters,
    sort_by: 'mission_created_at',
    sort_direction: 'desc',
    include_charts: true,
    page: 1,
    per_page: 20,
  };
};

function downloadBlob(blob: Blob, filename: string, options?: { openAfterDownload?: boolean }) {
  const url = window.URL.createObjectURL(blob);
  if (options?.openAfterDownload) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1500);
}

export function EditeurRapport() {
  const [columnOptions, setColumnOptions] = useState<ReportColumnResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<ReportFilterResponse | null>(null);
  const [savedConfigurations, setSavedConfigurations] = useState<SavedReportConfiguration[]>([]);
  const [config, setConfig] = useState<ReportConfigPayload>(makeDefaultConfig);
  const [preview, setPreview] = useState<ReportPreviewResponse | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [activeConfigId, setActiveConfigId] = useState<number | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'csv' | null>(null);

  const deferredConfig = useDeferredValue(config);

  useEffect(() => {
    const load = async () => {
      try {
        const [columns, filters, configs] = await Promise.all([
          rapportsApi.getColonnes(),
          rapportsApi.getFiltres(),
          rapportsApi.getConfigurations(),
        ]);

        setColumnOptions(columns);
        setFilterOptions(filters);
        setSavedConfigurations(configs);
        setConfig((current) => ({
          ...current,
          columns: current.columns.length > 0 ? current.columns : columns.default,
        }));
      } catch (error) {
        toast.error('Chargement des options de rapport impossible.');
      } finally {
        setBootstrapping(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (bootstrapping || !deferredConfig.start_date || !deferredConfig.end_date || deferredConfig.columns.length === 0) {
      return;
    }

    if (deferredConfig.start_date >= deferredConfig.end_date) {
      setPreview(null);
      setPreviewError('La date de debut doit etre strictement inferieure a la date de fin.');
      return;
    }

    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const data = await rapportsApi.generer(deferredConfig);
        setPreview(data);
      } catch (error) {
        setPreview(null);
        setPreviewError('Impossible de generer l apercu avec cette configuration.');
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [bootstrapping, deferredConfig]);

  const availableColumns = useMemo(() => columnOptions?.groupes ?? [], [columnOptions]);

  const updateConfig = (updater: (current: ReportConfigPayload) => ReportConfigPayload) => {
    setConfig((current) => updater(current));
  };

  const handlePeriodChange = (field: 'start_date' | 'end_date', value: string) => {
    updateConfig((current) => ({ ...current, [field]: value, page: 1 }));
  };

  const handleToggleColumn = (columnKey: string) => {
    updateConfig((current) => {
      const exists = current.columns.includes(columnKey);
      const nextColumns = exists
        ? current.columns.filter((column) => column !== columnKey)
        : [...current.columns, columnKey];

      return {
        ...current,
        columns: nextColumns,
        page: 1,
      };
    });
  };

  const handleFilterChange = (field: keyof ReportFiltersState, value: string | string[] | number[]) => {
    updateConfig((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [field]: value,
      },
      page: 1,
    }));
  };

  const handleSortChange = (field: 'sort_by' | 'sort_direction', value: string) => {
    updateConfig((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const handleSaveConfiguration = async () => {
    if (!saveName.trim()) {
      toast.error('Donnez un nom a la configuration.');
      return;
    }

    try {
      const saved = await rapportsApi.sauvegarderConfiguration({
        id: activeConfigId ?? undefined,
        nom: saveName.trim(),
        description: saveDescription.trim() || undefined,
        configuration: config,
      });

      setSavedConfigurations((current) => {
        const others = current.filter((item) => item.id !== saved.id);
        return [saved, ...others];
      });
      setActiveConfigId(saved.id);
      toast.success('Configuration enregistree.');
    } catch (error) {
      toast.error('Enregistrement impossible.');
    }
  };

  const handleApplyConfiguration = (saved: SavedReportConfiguration) => {
    startTransition(() => {
      setActiveConfigId(saved.id);
      setSaveName(saved.nom);
      setSaveDescription(saved.description ?? '');
      setConfig({
        ...saved.configuration,
        page: 1,
        per_page: 20,
      });
    });
  };

  const handleDeleteConfiguration = async (saved: SavedReportConfiguration) => {
    try {
      await rapportsApi.supprimerConfiguration(saved.id);
      setSavedConfigurations((current) => current.filter((item) => item.id !== saved.id));
      if (activeConfigId === saved.id) {
        setActiveConfigId(null);
      }
      toast.success('Configuration supprimee.');
    } catch (error) {
      toast.error('Suppression impossible.');
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    if (config.start_date >= config.end_date) {
      toast.error('Corrigez la periode avant export.');
      return;
    }

    setExporting(format);
    try {
      const blob = await rapportsApi.exporter(config, format);
      const extension = format === 'xlsx' ? 'xls' : format;
      downloadBlob(blob, `rapport-dynamique-${new Date().toISOString().slice(0, 10)}.${extension}`, {
        openAfterDownload: format === 'pdf',
      });
      toast.success(`Export ${format.toUpperCase()} termine.`);
    } catch (error) {
      toast.error(`Export ${format.toUpperCase()} impossible.`);
    } finally {
      setExporting(null);
    }
  };

  if (bootstrapping) {
    return <div className="card">Chargement du builder de rapports...</div>;
  }

  return (
    <section className="report-builder-shell">
      <div className="card report-builder-hero">
        <div>
          <p className="admin-eyebrow">Rapport builder</p>
          <h2>Editeur d etat RH / Admin</h2>
          <p>
            Construisez un rapport cible, verifiez l apercu, puis exportez en PDF, Excel ou CSV.
          </p>
        </div>
        <ExportButtons exporting={exporting} onExport={handleExport} />
      </div>

      <div className="report-builder-layout">
        <div className="report-builder-main">
          <SelectionPeriode
            startDate={config.start_date}
            endDate={config.end_date}
            onChange={handlePeriodChange}
          />

          <SelectionColonnes
            groups={availableColumns}
            selectedColumns={config.columns}
            defaultColumns={columnOptions?.default ?? []}
            onToggle={handleToggleColumn}
            onReset={() => updateConfig((current) => ({ ...current, columns: columnOptions?.default ?? current.columns, page: 1 }))}
          />

          <FiltresAvances
            filters={config.filters}
            filterOptions={filterOptions}
            sortBy={config.sort_by}
            sortDirection={config.sort_direction}
            includeCharts={config.include_charts}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onChartsChange={(checked) => updateConfig((current) => ({ ...current, include_charts: checked, page: 1 }))}
          />

          <ApercuTableau
            preview={preview}
            loading={previewLoading}
            error={previewError}
            onPageChange={(page) => updateConfig((current) => ({ ...current, page }))}
          />
        </div>

        <aside className="report-builder-side">
          <div className="card report-builder-section">
            <div className="report-builder-section-header">
              <div>
                <h3>Sauvegarder</h3>
                <p>Conservez vos modeles recurrents.</p>
              </div>
            </div>
            <label>
              Nom du modele
              <input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Rapport RH mensuel" />
            </label>
            <label>
              Description
              <textarea value={saveDescription} onChange={(event) => setSaveDescription(event.target.value)} placeholder="Montants rembourses par departement" />
            </label>
            <button type="button" onClick={handleSaveConfiguration}>
              {activeConfigId ? 'Mettre a jour la configuration' : 'Sauvegarder la configuration'}
            </button>
          </div>

          <div className="card report-builder-section">
            <div className="report-builder-section-header">
              <div>
                <h3>Modeles sauvegardes</h3>
                <p>Rechargez un rapport en un clic.</p>
              </div>
            </div>
            <div className="report-config-list">
              {savedConfigurations.length === 0 && <div className="report-preview-empty">Aucun modele enregistre.</div>}
              {savedConfigurations.map((saved) => (
                <article key={saved.id} className={`report-config-item${activeConfigId === saved.id ? ' active' : ''}`}>
                  <strong>{saved.nom}</strong>
                  <p>{saved.description || 'Sans description'}</p>
                  <small>Par {saved.creator?.nom ?? 'Utilisateur'} le {saved.updated_at.slice(0, 10)}</small>
                  <div className="action-row">
                    <button type="button" className="secondary" onClick={() => handleApplyConfiguration(saved)}>
                      Utiliser
                    </button>
                    <button type="button" className="danger" onClick={() => void handleDeleteConfiguration(saved)}>
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
