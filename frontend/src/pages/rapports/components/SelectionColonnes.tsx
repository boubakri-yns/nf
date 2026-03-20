import type { ReportColumnGroup } from '../../../types';

interface SelectionColonnesProps {
  groups: ReportColumnGroup[];
  selectedColumns: string[];
  defaultColumns: string[];
  onToggle: (columnKey: string) => void;
  onReset: () => void;
}

export function SelectionColonnes({
  groups,
  selectedColumns,
  defaultColumns,
  onToggle,
  onReset,
}: SelectionColonnesProps) {
  return (
    <div className="card report-builder-section">
      <div className="report-builder-section-header">
        <div>
          <h3>Colonnes</h3>
          <p>Choisissez les informations a afficher dans le rapport.</p>
        </div>
        <button type="button" className="secondary" onClick={onReset}>
          Revenir au modele RH
        </button>
      </div>
      <div className="report-columns-grid">
        {groups.map((group) => (
          <section key={group.label} className="report-columns-group">
            <h4>{group.label}</h4>
            {group.colonnes.map((column) => (
              <label key={column.key} className="report-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.key)}
                  onChange={() => onToggle(column.key)}
                />
                <span>{column.label}</span>
                {defaultColumns.includes(column.key) && <small>Defaut</small>}
              </label>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
