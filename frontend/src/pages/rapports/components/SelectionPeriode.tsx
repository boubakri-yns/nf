interface SelectionPeriodeProps {
  startDate: string;
  endDate: string;
  onChange: (field: 'start_date' | 'end_date', value: string) => void;
}

export function SelectionPeriode({ startDate, endDate, onChange }: SelectionPeriodeProps) {
  return (
    <div className="card report-builder-section">
      <div className="report-builder-section-header">
        <div>
          <h3>Periode</h3>
          <p>Definissez la fenetre temporelle du rapport.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Date debut
          <input type="date" value={startDate} onChange={(event) => onChange('start_date', event.target.value)} />
        </label>
        <label>
          Date fin
          <input type="date" value={endDate} onChange={(event) => onChange('end_date', event.target.value)} />
        </label>
      </div>
    </div>
  );
}
