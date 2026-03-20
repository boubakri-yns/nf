export type Role = 'Employe' | 'Manager' | 'RH' | 'Admin';

export interface User {
  id: number;
  nom: string;
  email: string;
  email_responsable: string | null;
  role: Role;
  matricule: string;
  departement: string | null;
  active?: boolean;
  responsable?: Pick<User, 'id' | 'nom' | 'email'> | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegistrationRequest {
  id: number;
  nom: string;
  email: string;
  email_responsable: string;
  matricule: string;
  departement: string;
  requested_password?: string;
  requested_role: 'Employe';
  statut: 'en_attente' | 'validee' | 'refusee';
  created_at: string;
  processed_at?: string | null;
  admin?: Pick<User, 'id' | 'nom' | 'email'> | null;
  commentaire_admin?: string | null;
  access_file_sent_at?: string | null;
}

export interface RegistrationRequestResponse {
  message: string;
  request: RegistrationRequest;
}

export interface CategorieDepense {
  id: number;
  nom: string;
  code: string;
  plafond_journalier: string | null;
  justificatif_obligatoire: boolean;
  active: boolean;
}

export interface LigneDepense {
  id: number;
  note_de_frais_id: number;
  categorie_id: number;
  date_depense: string;
  montant: string;
  justificatif_path?: string | null;
  commentaire?: string | null;
  categorie?: CategorieDepense;
}

export type StatutNote =
  | 'brouillon'
  | 'en_attente_responsable'
  | 'valide_manager'
  | 'en_attente_rh'
  | 'valide_rh'
  | 'valide_paiement'
  | 'refuse'
  | 'rembourse'
  | 'a_corriger';

export interface HistoriqueApprobation {
  id: number;
  note_de_frais_id: number;
  validateur_email: string;
  action:
    | 'approuve_manager'
    | 'approuve_rh'
    | 'refuse'
    | 'demande_correction'
    | 'rembourse'
    | 'archiver'
    | 'admin_update'
    | 'admin_force_status'
    | 'admin_expense_add'
    | 'admin_expense_update'
    | 'admin_expense_delete'
    | 'admin_receipt_delete';
  date_decision: string;
  commentaire?: string | null;
  validateur?: User;
}

export interface NoteDeFrais {
  id: number;
  titre_mission: string;
  matricule_employe: string;
  date_creation: string;
  total_note: string;
  statut: StatutNote;
  email_employe: string;
  email_responsable: string;
  commentaire_employe?: string | null;
  date_soumission?: string | null;
  date_validation_manager?: string | null;
  date_remboursement?: string | null;
  mode_remboursement?: 'virement_salaire' | 'virement_bancaire' | 'cheque' | null;
  reference_comptable?: string | null;
  paiement_effectue_le?: string | null;
  litige_commentaire?: string | null;
  document_remboursement_path?: string | null;
  archived_at?: string | null;
  employe?: User;
  responsable?: User;
  lignes_depense?: LigneDepense[];
  lignesDepense?: LigneDepense[];
  historique?: HistoriqueApprobation[];
}

export interface NotificationItem {
  id: number;
  user_email: string;
  type: 'note_soumise' | 'note_approuvee' | 'note_refusee' | 'note_correction' | 'note_remboursee' | 'registration_request' | 'registration_approved' | 'registration_refused';
  titre: string;
  message: string;
  data?: { note_id?: number } & Record<string, unknown>;
  est_lue: boolean;
  created_at: string;
}

export interface ParametreItem {
  id: number;
  cle: string;
  valeur: string;
  type: 'decimal' | 'integer' | 'boolean';
  description?: string | null;
}

export interface LoginAuditItem {
  id: number;
  user_email?: string | null;
  attempted_email?: string | null;
  impersonated_by_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  logged_in_at: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ReportColumnDefinition {
  key: string;
  label: string;
  sortable: boolean;
}

export interface ReportColumnGroup {
  label: string;
  colonnes: ReportColumnDefinition[];
}

export interface ReportColumnResponse {
  groupes: ReportColumnGroup[];
  default: string[];
}

export interface ReportFilterResponse {
  statuts: SelectOption[];
  departements: SelectOption[];
  managers: SelectOption[];
  employes: SelectOption[];
  sorts: SelectOption[];
  formats: SelectOption[];
}

export interface ReportFiltersState {
  statuses: string[];
  department: string;
  manager: string;
  employee: string;
  amount_min: string;
  amount_max: string;
  note_ids: number[];
}

export interface ReportConfigPayload {
  start_date: string;
  end_date: string;
  columns: string[];
  filters: ReportFiltersState;
  sort_by: string;
  sort_direction: 'asc' | 'desc';
  include_charts: boolean;
  page: number;
  per_page: number;
}

export interface ReportSummary {
  count: number;
  total_amount: number;
  average_amount: number;
  reimbursed_count: number;
  pending_count: number;
}

export interface ReportChartPoint {
  label: string;
  value: number;
}

export interface ReportPreviewResponse {
  columns: ReportColumnDefinition[];
  rows: Array<Record<string, string | number | null>>;
  summary: ReportSummary;
  charts: {
    categories: ReportChartPoint[];
    months: ReportChartPoint[];
  } | null;
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface SavedReportConfiguration {
  id: number;
  nom: string;
  description?: string | null;
  configuration: ReportConfigPayload;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
  creator?: Pick<User, 'id' | 'nom' | 'email'> | null;
}
