interface ExportButtonsProps {
  exporting: 'pdf' | 'xlsx' | 'csv' | null;
  onExport: (format: 'pdf' | 'xlsx' | 'csv') => void;
}

export function ExportButtons({ exporting, onExport }: ExportButtonsProps) {
  return (
    <div className="report-export-actions">
      <button type="button" onClick={() => onExport('pdf')} disabled={exporting !== null}>
        {exporting === 'pdf' ? 'Generation PDF...' : 'Exporter PDF'}
      </button>
      <button type="button" onClick={() => onExport('xlsx')} disabled={exporting !== null}>
        {exporting === 'xlsx' ? 'Generation Excel...' : 'Exporter Excel'}
      </button>
      <button type="button" onClick={() => onExport('csv')} disabled={exporting !== null}>
        {exporting === 'csv' ? 'Generation CSV...' : 'Exporter CSV'}
      </button>
    </div>
  );
}
