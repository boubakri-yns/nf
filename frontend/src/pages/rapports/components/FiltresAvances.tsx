import type { ReportFiltersState, ReportFilterResponse } from '../../../types';

interface FiltresAvancesProps {
  filters: ReportFiltersState;
  filterOptions: ReportFilterResponse | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  includeCharts: boolean;
  onFilterChange: (field: keyof ReportFiltersState, value: string | string[] | number[]) => void;
  onSortChange: (field: 'sort_by' | 'sort_direction', value: string) => void;
  onChartsChange: (checked: boolean) => void;
}

export function FiltresAvances({
  filters,
  filterOptions,
  sortBy,
  sortDirection,
  includeCharts,
  onFilterChange,
  onSortChange,
  onChartsChange,
}: FiltresAvancesProps) {
  const handleStatusChange = (value: string) => {
    const next = filters.statuses.includes(value)
      ? filters.statuses.filter((status) => status !== value)
      : [...filters.statuses, value];

    onFilterChange('statuses', next);
  };

  return (
    <div className="card report-builder-section">
      <div className="report-builder-section-header">
        <div>
          <h3>Filtres avances</h3>
          <p>Affinez la selection, le tri, et les exports par lots.</p>
        </div>
      </div>

      <div className="report-status-grid">
        {(filterOptions?.statuts ?? []).map((status) => (
          <label key={status.value} className="report-checkbox report-chip-checkbox">
            <input
              type="checkbox"
              checked={filters.statuses.includes(status.value)}
              onChange={() => handleStatusChange(status.value)}
            />
            <span>{status.label}</span>
          </label>
        ))}
      </div>

      <div className="form-grid">
        <label>
          Departement
          <select value={filters.department} onChange={(event) => onFilterChange('department', event.target.value)}>
            <option value="">Tous</option>
            {(filterOptions?.departements ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Manager
          <select value={filters.manager} onChange={(event) => onFilterChange('manager', event.target.value)}>
            <option value="">Tous</option>
            {(filterOptions?.managers ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Employe
          <select value={filters.employee} onChange={(event) => onFilterChange('employee', event.target.value)}>
            <option value="">Tous</option>
            {(filterOptions?.employes ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Montant min
          <input type="number" min="0" value={filters.amount_min} onChange={(event) => onFilterChange('amount_min', event.target.value)} />
        </label>
        <label>
          Montant max
          <input type="number" min="0" value={filters.amount_max} onChange={(event) => onFilterChange('amount_max', event.target.value)} />
        </label>
        <label>
          Tri
          <select value={sortBy} onChange={(event) => onSortChange('sort_by', event.target.value)}>
            {(filterOptions?.sorts ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Ordre
          <select value={sortDirection} onChange={(event) => onSortChange('sort_direction', event.target.value)}>
            <option value="desc">Descendant</option>
            <option value="asc">Ascendant</option>
          </select>
        </label>
        <label>
          Export par lots
          <input
            type="text"
            value={filters.note_ids.join(', ')}
            placeholder="1, 2, 3"
            onChange={(event) => {
              const ids = event.target.value
                .split(',')
                .map((token) => Number(token.trim()))
                .filter((value) => Number.isFinite(value) && value > 0);
              onFilterChange('note_ids', ids);
            }}
          />
        </label>
      </div>

      <label className="report-checkbox">
        <input type="checkbox" checked={includeCharts} onChange={(event) => onChartsChange(event.target.checked)} />
        <span>Inclure les graphiques dans l apercu et les exports Excel</span>
      </label>
    </div>
  );
}
