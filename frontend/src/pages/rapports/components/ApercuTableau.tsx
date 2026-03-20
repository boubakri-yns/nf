import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReportPreviewResponse } from '../../../types';

interface ApercuTableauProps {
  preview: ReportPreviewResponse | null;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
}

const chartColors = ['#b91c1c', '#171717', '#525252', '#a3a3a3', '#ef4444'];

export function ApercuTableau({ preview, loading, error, onPageChange }: ApercuTableauProps) {
  return (
    <div className="card report-preview-card">
      <div className="report-builder-section-header">
        <div>
          <h3>Apercu dynamique</h3>
          <p>Limite a 20 lignes pour garder une lecture rapide avant export.</p>
        </div>
      </div>

      {loading && <div className="report-preview-empty">Mise a jour de l apercu...</div>}
      {error && !loading && <div className="report-error-banner">{error}</div>}

      {!loading && !error && preview && (
        <>
          <div className="report-summary-grid">
            <article><span>Notes</span><strong>{preview.summary.count}</strong></article>
            <article><span>Montant total</span><strong>{preview.summary.total_amount.toFixed(2)} DH</strong></article>
            <article><span>Moyenne</span><strong>{preview.summary.average_amount.toFixed(2)} DH</strong></article>
            <article><span>Remboursees</span><strong>{preview.summary.reimbursed_count}</strong></article>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.length === 0 && (
                  <tr>
                    <td colSpan={preview.columns.length}>Aucune ligne ne correspond aux filtres selectionnes.</td>
                  </tr>
                )}
                {preview.rows.map((row, index) => (
                  <tr key={`preview-row-${index}`}>
                    {preview.columns.map((column) => (
                      <td key={`${column.key}-${index}`}>{row[column.key] ?? '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-pagination">
            <button type="button" className="secondary" disabled={preview.meta.page <= 1} onClick={() => onPageChange(preview.meta.page - 1)}>
              Page precedente
            </button>
            <span>
              Page {preview.meta.page} / {Math.max(preview.meta.total_pages, 1)} - {preview.meta.total} lignes
            </span>
            <button
              type="button"
              className="secondary"
              disabled={preview.meta.page >= preview.meta.total_pages}
              onClick={() => onPageChange(preview.meta.page + 1)}
            >
              Page suivante
            </button>
          </div>

          {preview.charts && (
            <div className="report-charts-grid">
              <div className="report-chart-panel">
                <h4>Camembert categories</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={preview.charts.categories} dataKey="value" nameKey="label" outerRadius={80}>
                      {preview.charts.categories.map((entry, index) => (
                        <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="report-chart-panel">
                <h4>Histogramme mensuel</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={preview.charts.months}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#171717" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && !preview && <div className="report-preview-empty">Selectionnez une periode valide pour charger un apercu.</div>}
    </div>
  );
}
