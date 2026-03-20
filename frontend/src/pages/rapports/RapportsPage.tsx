import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { EditeurRapport } from './EditeurRapport';

const keyPoints = [
  'Choisir une periode',
  'Selectionner les colonnes utiles',
  'Appliquer des filtres et un tri',
  "Voir l'apercu instantanement",
  'Exporter en PDF, Excel ou CSV',
  'Sauvegarder un modele reutilisable',
];

const roleItems = [
  {
    role: 'RH',
    description: 'Cree des rapports personnalises, suit les depenses, analyse les notes en attente et exporte pour la comptabilite.',
  },
  {
    role: 'Admin',
    description: 'Fait tout ce que fait le RH avec une vision plus large pour le controle, les audits et les modeles de reference.',
  },
];

export function RapportsPage() {
  const { user } = useAuth();

  if (user?.role !== 'Admin' && user?.role !== 'RH') {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="report-builder-shell">
      <div className="card report-builder-hero">
        <div>
          <p className="admin-eyebrow">Rapports</p>
          <h2>Creation de rapports personnalises</h2>
          <p>
            Cette partie sert a construire un rapport, verifier son apercu immediat, l exporter et enregistrer sa configuration.
          </p>
        </div>
      </div>

      <div className="report-overview-layout">
        <div className="card report-overview-card">
          <h3>Principe</h3>
          <ul className="report-overview-list">
            {keyPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card report-overview-card">
          <h3>Acteurs</h3>
          {roleItems.map((item) => (
            <div key={item.role} className="report-role-block">
              <strong>{item.role}</strong>
              <p className="report-overview-text" style={{ marginBottom: 0 }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <EditeurRapport />
    </section>
  );
}
