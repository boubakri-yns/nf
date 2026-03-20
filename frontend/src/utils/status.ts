import type { StatutNote } from '../types';

export function getStatusLabel(status: StatutNote): string {
  switch (status) {
    case 'brouillon':
      return 'Brouillon';
    case 'en_attente_responsable':
      return 'En attente Responsable';
    case 'en_attente_rh':
    return 'Valide Manager';
    case 'valide_manager':
      return 'Valide Manager';
    case 'valide_rh':
      return 'Valide RH';
    case 'valide_paiement':
      return 'Valide RH';
    case 'refuse':
      return 'Refuse';
    case 'rembourse':
      return 'Rembourse';
    case 'a_corriger':
      return 'A corriger';
    default:
      return status;
  }
}
