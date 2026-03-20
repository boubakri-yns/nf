import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import type {
  AuthResponse,
  CategorieDepense,
  HistoriqueApprobation,
  LigneDepense,
  NoteDeFrais,
  NotificationItem,
  ParametreItem,
  RegistrationRequest,
  RegistrationRequestResponse,
  ReportColumnResponse,
  ReportFilterResponse,
  ReportPreviewResponse,
  SavedReportConfiguration,
  User,
} from '../types';

type MockRequestConfig = InternalAxiosRequestConfig & {
  params?: Record<string, unknown>;
  data?: unknown;
};

type MockState = {
  users: User[];
  categories: CategorieDepense[];
  parametres: ParametreItem[];
  registrationRequests: RegistrationRequest[];
  notes: NoteDeFrais[];
  notifications: NotificationItem[];
  reportConfigurations: SavedReportConfiguration[];
  nextIds: {
    user: number;
    note: number;
    expense: number;
    history: number;
    notification: number;
    reportConfiguration: number;
    registrationRequest: number;
  };
};

const STORAGE_KEY = 'nv-fast-local-state:v3';
const DEMO_TOKEN_PREFIX = 'demo-token:';
const LOCAL_TOKEN_PREFIX = 'local-token:';
const FAST_LOCAL_MODE_KEY = 'nv-fast-local-mode';

const today = new Date().toISOString().slice(0, 10);

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function buildToken(email: string, demo = false) {
  return `${demo ? DEMO_TOKEN_PREFIX : LOCAL_TOKEN_PREFIX}${email}`;
}

function isManagedToken(token: string | null | undefined) {
  return Boolean(token && (token.startsWith(DEMO_TOKEN_PREFIX) || token.startsWith(LOCAL_TOKEN_PREFIX)));
}

export function isManagedSessionToken(token: string | null | undefined) {
  return isManagedToken(token);
}

function canUseMockModeForToken(token: string | null | undefined) {
  return !token || isManagedToken(token);
}

export function isDemoToken(token: string | null | undefined) {
  return Boolean(token?.startsWith(DEMO_TOKEN_PREFIX));
}

export function enableFastLocalMode() {
  if (canUseStorage()) {
    window.localStorage.setItem(FAST_LOCAL_MODE_KEY, 'true');
  }
}

export function disableFastLocalMode() {
  if (canUseStorage()) {
    window.localStorage.removeItem(FAST_LOCAL_MODE_KEY);
  }
}

export function isMockAxiosResponse(response: Pick<AxiosResponse, 'headers'> | null | undefined) {
  return response?.headers?.['x-local-mock'] === 'true';
}

function isFastLocalModeStored() {
  return canUseStorage() && window.localStorage.getItem(FAST_LOCAL_MODE_KEY) === 'true';
}

function createBaseUsers(): User[] {
  return [
    {
      id: 1,
      nom: 'Admin App',
      email: 'admin.app@nf.com',
      email_responsable: null,
      role: 'Admin',
      matricule: 'ADM1001',
      departement: 'Administration',
      active: true,
      responsable: null,
    },
    {
      id: 2,
      nom: 'RH App',
      email: 'rh.app@nf.com',
      email_responsable: null,
      role: 'RH',
      matricule: 'RH1001',
      departement: 'Ressources Humaines',
      active: true,
      responsable: null,
    },
    {
      id: 3,
      nom: 'Manager 1',
      email: 'manager1.app@nf.com',
      email_responsable: 'rh.app@nf.com',
      role: 'Manager',
      matricule: 'MNG1001',
      departement: 'Operations',
      active: true,
      responsable: { id: 2, nom: 'RH App', email: 'rh.app@nf.com' },
    },
    {
      id: 4,
      nom: 'Manager 2',
      email: 'manager2.app@nf.com',
      email_responsable: 'rh.app@nf.com',
      role: 'Manager',
      matricule: 'MNG1002',
      departement: 'Operations',
      active: true,
      responsable: { id: 2, nom: 'RH App', email: 'rh.app@nf.com' },
    },
    {
      id: 5,
      nom: 'Younes Boubakri',
      email: 'younesboubakri37@gmail.com',
      email_responsable: 'manager1.app@nf.com',
      role: 'Employe',
      matricule: 'EMP1001',
      departement: 'Technique',
      active: true,
      responsable: { id: 3, nom: 'Manager 1', email: 'manager1.app@nf.com' },
    },
    {
      id: 6,
      nom: 'Vatican Baba',
      email: 'vaticanbaba@gmail.com',
      email_responsable: 'manager1.app@nf.com',
      role: 'Employe',
      matricule: 'EMP1002',
      departement: 'Technique',
      active: true,
      responsable: { id: 3, nom: 'Manager 1', email: 'manager1.app@nf.com' },
    },
    {
      id: 7,
      nom: 'Younes Boubakri Pro',
      email: 'younesboubakripro@gmail.com',
      email_responsable: 'manager2.app@nf.com',
      role: 'Employe',
      matricule: 'EMP1003',
      departement: 'Operations',
      active: true,
      responsable: { id: 4, nom: 'Manager 2', email: 'manager2.app@nf.com' },
    },
    {
      id: 8,
      nom: 'Ali Khat',
      email: 'alikhat050@gmail.com',
      email_responsable: 'manager2.app@nf.com',
      role: 'Employe',
      matricule: 'EMP1004',
      departement: 'Operations',
      active: true,
      responsable: { id: 4, nom: 'Manager 2', email: 'manager2.app@nf.com' },
    },
  ];
}

function createInitialState(): MockState {
  const users = createBaseUsers();
  const getUser = (email: string) => {
    const user = users.find((item) => item.email === email);
    if (!user) {
      throw new Error(`Utilisateur introuvable: ${email}`);
    }
    return user;
  };

  const categories: CategorieDepense[] = [
    { id: 1, nom: 'Transport', code: 'TRP', plafond_journalier: '450', justificatif_obligatoire: true, active: true },
    { id: 2, nom: 'Hotel', code: 'HTL', plafond_journalier: '1200', justificatif_obligatoire: true, active: true },
    { id: 3, nom: 'Repas', code: 'RPS', plafond_journalier: '250', justificatif_obligatoire: false, active: true },
    { id: 4, nom: 'Fournitures', code: 'FRN', plafond_journalier: null, justificatif_obligatoire: false, active: true },
  ];

  const parametres: ParametreItem[] = [
    { id: 1, cle: 'seuil_justificatif', valeur: '150', type: 'decimal', description: 'Montant a partir duquel un justificatif est recommande.' },
    { id: 2, cle: 'delai_traitement_rh_jours', valeur: '2', type: 'integer', description: 'Delai cible de traitement RH.' },
    { id: 3, cle: 'workflow_fast_local', valeur: 'true', type: 'boolean', description: 'Mode rapide local active.' },
  ];

  const notes: NoteDeFrais[] = [
    {
      id: 1,
      titre_mission: 'Salon fournisseurs Tanger',
      matricule_employe: 'EMP1002',
      date_creation: '2026-03-03',
      total_note: '1340.00',
      statut: 'en_attente_responsable',
      email_employe: 'vaticanbaba@gmail.com',
      email_responsable: 'manager1.app@nf.com',
      commentaire_employe: 'Mission de prospection fournisseurs.',
      date_soumission: '2026-03-04',
      employe: getUser('vaticanbaba@gmail.com'),
      responsable: getUser('manager1.app@nf.com'),
      lignes_depense: [
        {
          id: 1,
          note_de_frais_id: 1,
          categorie_id: 1,
          date_depense: '2026-03-03',
          montant: '340',
          justificatif_path: 'mock://receipt/1',
          commentaire: 'Taxi et train',
          categorie: categories[0],
        },
        {
          id: 2,
          note_de_frais_id: 1,
          categorie_id: 2,
          date_depense: '2026-03-03',
          montant: '1000',
          justificatif_path: 'mock://receipt/2',
          commentaire: 'Hotel Tanger',
          categorie: categories[1],
        },
      ],
      lignesDepense: [],
      historique: [],
    },
    {
      id: 2,
      titre_mission: 'Audit usine Casablanca',
      matricule_employe: 'EMP1003',
      date_creation: '2026-03-01',
      total_note: '780.00',
      statut: 'valide_manager',
      email_employe: 'younesboubakripro@gmail.com',
      email_responsable: 'manager2.app@nf.com',
      commentaire_employe: 'Controle qualite trimestriel.',
      date_soumission: '2026-03-01',
      date_validation_manager: '2026-03-02',
      employe: getUser('younesboubakripro@gmail.com'),
      responsable: getUser('manager2.app@nf.com'),
      lignes_depense: [
        {
          id: 3,
          note_de_frais_id: 2,
          categorie_id: 3,
          date_depense: '2026-03-01',
          montant: '180',
          justificatif_path: null,
          commentaire: 'Repas equipe',
          categorie: categories[2],
        },
        {
          id: 4,
          note_de_frais_id: 2,
          categorie_id: 1,
          date_depense: '2026-03-01',
          montant: '600',
          justificatif_path: 'mock://receipt/4',
          commentaire: 'Transport interne',
          categorie: categories[0],
        },
      ],
      lignesDepense: [],
      historique: [],
    },
    {
      id: 3,
      titre_mission: 'Formation ERP Rabat',
      matricule_employe: 'EMP1002',
      date_creation: '2026-02-23',
      total_note: '950.00',
      statut: 'rembourse',
      email_employe: 'vaticanbaba@gmail.com',
      email_responsable: 'manager1.app@nf.com',
      commentaire_employe: 'Formation interne.',
      date_soumission: '2026-02-24',
      date_validation_manager: '2026-02-25',
      date_remboursement: '2026-02-27',
      paiement_effectue_le: '2026-02-27',
      mode_remboursement: 'virement_salaire',
      document_remboursement_path: 'mock://reimbursement/3',
      employe: getUser('vaticanbaba@gmail.com'),
      responsable: getUser('manager1.app@nf.com'),
      lignes_depense: [
        {
          id: 5,
          note_de_frais_id: 3,
          categorie_id: 3,
          date_depense: '2026-02-23',
          montant: '200',
          justificatif_path: null,
          commentaire: 'Repas',
          categorie: categories[2],
        },
        {
          id: 6,
          note_de_frais_id: 3,
          categorie_id: 2,
          date_depense: '2026-02-23',
          montant: '750',
          justificatif_path: 'mock://receipt/6',
          commentaire: 'Nuit d hotel',
          categorie: categories[1],
        },
      ],
      lignesDepense: [],
      historique: [],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 1,
      user_email: 'manager1.app@nf.com',
      type: 'note_soumise',
      titre: 'Nouvelle note a valider',
      message: 'Salon fournisseurs Tanger attend votre validation.',
      data: { note_id: 1 },
      est_lue: false,
      created_at: '2026-03-04T08:30:00.000Z',
    },
    {
      id: 2,
      user_email: 'rh.app@nf.com',
      type: 'note_approuvee',
      titre: 'Note transmise au RH',
      message: 'Audit usine Casablanca est prete pour le remboursement.',
      data: { note_id: 2 },
      est_lue: false,
      created_at: '2026-03-02T10:00:00.000Z',
    },
    {
      id: 3,
      user_email: 'vaticanbaba@gmail.com',
      type: 'note_remboursee',
      titre: 'Remboursement effectue',
      message: 'La note Formation ERP Rabat a ete remboursee.',
      data: { note_id: 3 },
      est_lue: true,
      created_at: '2026-02-27T15:00:00.000Z',
    },
  ];

  const registrationRequests: RegistrationRequest[] = [
    {
      id: 1,
      nom: 'Amina Nouvelle',
      email: 'amina.nouvelle@nexans.com',
      email_responsable: 'manager1.app@nf.com',
      matricule: 'EMP010',
      departement: 'Industrialisation',
      requested_password: 'Password123!',
      requested_role: 'Employe',
      statut: 'en_attente',
      created_at: '2026-03-15T09:30:00.000Z',
      processed_at: null,
      admin: { id: 1, nom: 'Admin App', email: 'admin.app@nf.com' },
      commentaire_admin: null,
      access_file_sent_at: null,
    },
  ];

  const state: MockState = {
    users,
    categories,
    parametres,
    registrationRequests,
    notes,
    notifications,
    reportConfigurations: [],
    nextIds: {
      user: 9,
      note: 4,
      expense: 7,
      history: 1,
      notification: 4,
      reportConfiguration: 1,
      registrationRequest: 2,
    },
  };

  state.notes = state.notes.map((note) => normalizeNote(state, note));
  return state;
}

let memoryState: MockState | null = null;

function persistState() {
  if (canUseStorage() && memoryState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  }
}

function attachUserRelations(state: MockState, user: User): User {
  const responsible = user.email_responsable ? state.users.find((item) => item.email === user.email_responsable) : null;
  return {
    ...user,
    responsable: responsible ? { id: responsible.id, nom: responsible.nom, email: responsible.email } : null,
  };
}

function computeTotal(expenses: LigneDepense[]) {
  return expenses.reduce((sum, item) => sum + Number(item.montant || 0), 0);
}

function normalizeNote(state: MockState, note: NoteDeFrais): NoteDeFrais {
  const employe = state.users.find((item) => item.email === note.email_employe) ?? note.employe;
  const responsable = state.users.find((item) => item.email === note.email_responsable) ?? note.responsable;
  const lignes = (note.lignes_depense ?? note.lignesDepense ?? []).map((expense) => ({
    ...expense,
    categorie: state.categories.find((category) => category.id === expense.categorie_id) ?? expense.categorie,
  }));
  const historique = (note.historique ?? []).map((item) => ({
    ...item,
    validateur: state.users.find((user) => user.email === item.validateur_email) ?? item.validateur,
  }));

  return {
    ...note,
    employe,
    responsable,
    lignes_depense: lignes,
    lignesDepense: lignes,
    historique,
    total_note: computeTotal(lignes).toFixed(2),
  };
}

function normalizeState(state: MockState): MockState {
  const fallback = createInitialState();
  const next = cloneDeep(state) as MockState & {
    users?: User[];
    categories?: CategorieDepense[];
    parametres?: ParametreItem[];
    registrationRequests?: RegistrationRequest[];
    notes?: NoteDeFrais[];
    notifications?: NotificationItem[];
    reportConfigurations?: SavedReportConfiguration[];
    nextIds?: Partial<MockState['nextIds']>;
  };
  next.users = next.users ?? fallback.users;
  next.categories = next.categories ?? fallback.categories;
  next.parametres = next.parametres ?? fallback.parametres;
  next.registrationRequests = next.registrationRequests ?? [];
  next.notes = next.notes ?? fallback.notes;
  next.notifications = next.notifications ?? fallback.notifications;
  next.reportConfigurations = next.reportConfigurations ?? [];
  next.nextIds = {
    user: next.nextIds?.user ?? fallback.nextIds.user,
    note: next.nextIds?.note ?? fallback.nextIds.note,
    expense: next.nextIds?.expense ?? fallback.nextIds.expense,
    history: next.nextIds?.history ?? fallback.nextIds.history,
    notification: next.nextIds?.notification ?? fallback.nextIds.notification,
    reportConfiguration: next.nextIds?.reportConfiguration ?? fallback.nextIds.reportConfiguration,
    registrationRequest: next.nextIds?.registrationRequest ?? (next.registrationRequests.length + 1),
  };
  next.notes = next.notes.map((note) => normalizeNote(next, note));
  next.users = next.users.map((user) => attachUserRelations(next, user));
  return next as MockState;
}

function getState(): MockState {
  if (memoryState) {
    return memoryState;
  }

  if (canUseStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MockState;
        memoryState = normalizeState(parsed);
        return memoryState;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  memoryState = createInitialState();
  persistState();
  return memoryState;
}

function getTokenFromConfig(config?: AxiosRequestConfig) {
  const headerValue = config?.headers && 'Authorization' in config.headers ? config.headers.Authorization : undefined;
  const raw = typeof headerValue === 'string' ? headerValue : null;
  return raw?.startsWith('Bearer ') ? raw.slice('Bearer '.length) : null;
}

function extractEmailFromToken(token: string | null | undefined) {
  if (!token || !isManagedToken(token)) {
    return null;
  }

  return token.includes(':') ? token.slice(token.indexOf(':') + 1) : null;
}

function currentUserFromToken(token: string | null | undefined) {
  const email = extractEmailFromToken(token);
  if (!email) {
    return null;
  }

  const state = getState();
  const user = state.users.find((item) => item.email === email && item.active !== false);
  return user ? attachUserRelations(state, user) : null;
}

export function resolveUserFromStoredSession(token: string | null | undefined, storedUser?: User | null) {
  const tokenUser = currentUserFromToken(token);
  if (tokenUser) {
    return tokenUser;
  }

  if (storedUser && storedUser.active !== false && isManagedToken(token)) {
    return attachUserRelations(getState(), storedUser);
  }

  return null;
}

export function shouldMockImmediately(token: string | null | undefined) {
  return isDemoToken(token) || (isFastLocalModeStored() && canUseMockModeForToken(token));
}

function shouldHandleLocally(config: AxiosRequestConfig) {
  const token = getTokenFromConfig(config) ?? (canUseStorage() ? window.localStorage.getItem('token') : null);
  return shouldMockImmediately(token);
}

function buildAxiosResponse<T>(config: MockRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {
      'x-local-mock': 'true',
    },
    config,
  };
}

function buildMockError(config: MockRequestConfig, status: number, message: string): AxiosError {
  return new AxiosError(
    message,
    status === 401 ? 'ERR_BAD_REQUEST' : 'ERR_BAD_RESPONSE',
    config,
    undefined,
    buildAxiosResponse(config, { message }, status),
  );
}

function parseUrl(config: MockRequestConfig) {
  const rawUrl = config.url ?? '/';
  const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://local.mock');
  return {
    pathname: url.pathname.replace(/\/api$/, '') || '/',
    searchParams: url.searchParams,
  };
}

function getCombinedParams(config: MockRequestConfig) {
  const { searchParams } = parseUrl(config);
  const params = new Map<string, string>();
  searchParams.forEach((value, key) => params.set(key, value));
  Object.entries((config.params ?? {}) as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params;
}

function asObjectPayload(config: MockRequestConfig) {
  if (config.data instanceof FormData) {
    const result: Record<string, unknown> = {};
    config.data.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return (config.data as Record<string, unknown> | undefined) ?? {};
}

function ensureAuth(config: MockRequestConfig) {
  const token = getTokenFromConfig(config) ?? (canUseStorage() ? window.localStorage.getItem('token') : null);
  const user = currentUserFromToken(token);
  if (!user) {
    throw buildMockError(config, 401, 'Session locale invalide.');
  }
  return user;
}

function canAccessNote(user: User, note: NoteDeFrais) {
  if (user.role === 'Admin' || user.role === 'RH') return true;
  if (user.role === 'Manager') {
    return note.email_responsable === user.email || note.employe?.email_responsable === user.email;
  }
  return note.email_employe === user.email;
}

function getVisibleNotes(user: User, state: MockState) {
  if (user.role === 'Admin' || user.role === 'RH') return state.notes;
  if (user.role === 'Manager') {
    return state.notes.filter((note) => (
      note.email_responsable === user.email
      || note.employe?.email_responsable === user.email
    ));
  }
  return state.notes.filter((note) => note.email_employe === user.email);
}

function addHistory(state: MockState, note: NoteDeFrais, validateurEmail: string, action: HistoriqueApprobation['action'], commentaire?: string | null) {
  const item: HistoriqueApprobation = {
    id: state.nextIds.history++,
    note_de_frais_id: note.id,
    validateur_email: validateurEmail,
    action,
    commentaire: commentaire ?? null,
    date_decision: today,
    validateur: state.users.find((user) => user.email === validateurEmail),
  };
  note.historique = [...(note.historique ?? []), item];
}

function addNotification(state: MockState, notification: Omit<NotificationItem, 'id' | 'created_at'>) {
  state.notifications.unshift({
    ...notification,
    id: state.nextIds.notification++,
    created_at: new Date().toISOString(),
  });
}

function updateNoteInState(state: MockState, note: NoteDeFrais) {
  const normalized = normalizeNote(state, note);
  state.notes = state.notes.map((item) => (item.id === normalized.id ? normalized : item));
  return normalized;
}

function createAuthResponse(user: User, demo = false): AuthResponse {
  return {
    user: attachUserRelations(getState(), user),
    token: buildToken(user.email, demo),
  };
}

function createRegistrationFileBlob(request: RegistrationRequest) {
  const content = [
    'DOSSIER INSCRIPTION NV',
    `Nom: ${request.nom}`,
    `Email: ${request.email}`,
    `Matricule: ${request.matricule}`,
    `Departement: ${request.departement}`,
    `Manager: ${request.email_responsable}`,
    `Validation admin: ${request.admin?.nom ?? 'Admin NV'}`,
    `Statut: ${request.statut}`,
    `Date demande: ${request.created_at.slice(0, 10)}`,
    `Commentaire admin: ${request.commentaire_admin ?? '-'}`,
    '',
    'INFOS DE CONNEXION',
    `Identifiant: ${request.email}`,
    `Mot de passe initial: ${request.requested_password ?? 'celui saisi a l inscription'}`,
  ].join('\r\n');

  return new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8' });
}

function createMockBlob(label: string, type: string) {
  return new Blob([label], { type });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(value: string | number | null | undefined) {
  const normalized = String(value ?? '');
  if (/[",;\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function sanitizePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function splitPdfLine(value: string, maxLength = 95) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function buildReportRows(state: MockState, user: User) {
  const standardColumns = [
    { key: 'titre_mission', label: 'Mission', sortable: true },
    { key: 'employe_nom', label: 'Employe', sortable: true },
    { key: 'statut', label: 'Statut', sortable: true },
    { key: 'total_note', label: 'Montant', sortable: true },
    { key: 'departement', label: 'Departement', sortable: true },
  ];

  const adminColumns = [
    { key: 'reference_comptable', label: 'Reference interne', sortable: true },
    { key: 'matricule_employe', label: 'Matricule', sortable: true },
    { key: 'manager_nom', label: 'Manager', sortable: true },
    { key: 'date_validation_manager', label: 'Date validation', sortable: true },
    { key: 'paiement_effectue_le', label: 'Paiement effectue le', sortable: true },
    { key: 'litige_commentaire', label: 'Commentaire sensible', sortable: false },
    { key: 'historique_complet', label: 'Historique complet', sortable: false },
  ];

  const reportColumns: ReportColumnResponse = {
    groupes: [
      {
        label: 'Vue metier',
        colonnes: standardColumns,
      },
      ...(user.role === 'Admin'
        ? [
            {
              label: 'Audit admin',
              colonnes: adminColumns,
            },
          ]
        : []),
    ],
    default: user.role === 'Admin'
      ? ['titre_mission', 'employe_nom', 'statut', 'total_note', 'departement', 'reference_comptable', 'manager_nom']
      : ['titre_mission', 'employe_nom', 'statut', 'total_note', 'departement'],
  };

  const rows = getVisibleNotes(user, state).map((note) => ({
    id: note.id,
    titre_mission: note.titre_mission,
    employe_nom: note.employe?.nom ?? note.email_employe,
    email_employe: note.email_employe,
    statut: note.statut,
    total_note: Number(note.total_note),
    departement: note.employe?.departement ?? '-',
    reference_comptable: note.reference_comptable ?? `REF-${String(note.id).padStart(4, '0')}`,
    matricule_employe: note.matricule_employe,
    manager_nom: note.responsable?.nom ?? note.email_responsable,
    date_validation_manager: note.date_validation_manager ?? '-',
    paiement_effectue_le: note.paiement_effectue_le ?? '-',
    litige_commentaire: note.litige_commentaire ?? '-',
    historique_complet: (note.historique ?? []).length > 0
      ? (note.historique ?? [])
          .map((item) => `${item.date_decision} - ${item.action} - ${item.validateur?.nom ?? item.validateur_email}${item.commentaire ? ` (${item.commentaire})` : ''}`)
          .join(' | ')
      : 'Aucun historique',
  }));

  return { reportColumns, rows };
}

function createCsvExportBlob(columns: Array<{ key: string; label: string }>, rows: Array<Record<string, string | number | null>>) {
  const header = columns.map((column) => escapeCsv(column.label)).join(';');
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(';')).join('\r\n');
  return new Blob([`\uFEFF${header}\r\n${body}`], { type: 'text/csv;charset=utf-8' });
}

function createExcelExportBlob(columns: Array<{ key: string; label: string }>, rows: Array<Record<string, string | number | null>>) {
  const tableHeader = columns.map((column) => `<Cell><Data ss:Type="String">${escapeXml(column.label)}</Data></Cell>`).join('');
  const tableRows = rows
    .map((row) => {
      const cells = columns.map((column) => {
        const value = row[column.key];
        const isNumber = typeof value === 'number';
        const type = isNumber ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(String(value ?? ''))}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Rapport">
  <Table>
   <Row>${tableHeader}</Row>
   ${tableRows}
  </Table>
 </Worksheet>
</Workbook>`;

  return new Blob([workbook], { type: 'application/vnd.ms-excel' });
}

function createPdfExportBlob(lines: string[]) {
  const wrappedLines = lines.flatMap((line) => splitPdfLine(line));
  const contentLines = ['BT', '/F1 12 Tf'];
  let y = 800;

  wrappedLines.slice(0, 38).forEach((line) => {
    contentLines.push(`1 0 0 1 45 ${y} Tm`);
    contentLines.push(`(${sanitizePdfText(line)}) Tj`);
    y -= 18;
  });

  contentLines.push('ET');
  const streamContent = contentLines.join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${streamContent.length} >> stream\n${streamContent}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function buildPdfExportLines(preview: ReportPreviewResponse) {
  const columnLabels = preview.columns.map((column) => column.label);
  const rows = preview.rows.slice(0, 12).map((row, index) => {
    const values = preview.columns.map((column) => `${column.label}: ${String(row[column.key] ?? '-')}`);
    return [`Ligne ${index + 1}`, ...values, ''];
  });

  return [
    'Rapport NV - Export local',
    `Date: ${today}`,
    `Nombre de notes: ${preview.summary.count}`,
    `Montant total: ${preview.summary.total_amount.toFixed(2)} DH`,
    `Montant moyen: ${preview.summary.average_amount.toFixed(2)} DH`,
    `Remboursees: ${preview.summary.reimbursed_count}`,
    `En attente: ${preview.summary.pending_count}`,
    '',
    `Colonnes exportees: ${columnLabels.join(' | ')}`,
    '',
    ...rows.flat(),
  ];
}

function applyFilters(notes: NoteDeFrais[], params: Map<string, string>) {
  let result = [...notes];
  const search = params.get('search')?.toLowerCase().trim();
  const statut = params.get('statut');
  const emailEmploye = params.get('email_employe')?.toLowerCase().trim();
  const emailResponsable = params.get('email_responsable')?.toLowerCase().trim();
  const departement = params.get('departement')?.toLowerCase().trim();
  const dateDebut = params.get('date_debut');
  const dateFin = params.get('date_fin');
  const montantMin = Number(params.get('montant_min') ?? '');
  const montantMax = Number(params.get('montant_max') ?? '');
  const sort = params.get('sort') ?? 'date_creation';
  const direction = params.get('direction') === 'asc' ? 'asc' : 'desc';

  if (search) {
    result = result.filter((note) =>
      [note.titre_mission, note.email_employe, note.email_responsable, note.matricule_employe]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }
  if (statut) result = result.filter((note) => note.statut === statut);
  if (emailEmploye) result = result.filter((note) => note.email_employe.toLowerCase().includes(emailEmploye));
  if (emailResponsable) result = result.filter((note) => note.email_responsable.toLowerCase().includes(emailResponsable));
  if (departement) result = result.filter((note) => (note.employe?.departement ?? '').toLowerCase().includes(departement));
  if (dateDebut) result = result.filter((note) => note.date_creation >= dateDebut);
  if (dateFin) result = result.filter((note) => note.date_creation <= dateFin);
  if (!Number.isNaN(montantMin)) result = result.filter((note) => Number(note.total_note) >= montantMin);
  if (!Number.isNaN(montantMax)) result = result.filter((note) => Number(note.total_note) <= montantMax);

  result.sort((left, right) => {
    const multiplier = direction === 'asc' ? 1 : -1;
    if (sort === 'total_note') return (Number(left.total_note) - Number(right.total_note)) * multiplier;
    const leftValue = String((left as unknown as Record<string, unknown>)[sort] ?? '');
    const rightValue = String((right as unknown as Record<string, unknown>)[sort] ?? '');
    return leftValue.localeCompare(rightValue) * multiplier;
  });

  return result;
}

function getDashboardData(user: User) {
  const state = getState();
  const notes = getVisibleNotes(user, state);
  const totalMonth = notes
    .filter((note) => note.date_creation.startsWith(today.slice(0, 7)))
    .reduce((sum, note) => sum + Number(note.total_note), 0);

  const summary = {
    total_notes: notes.length,
    notes_en_cours: notes.filter((note) => ['brouillon', 'a_corriger'].includes(note.statut)).length,
    notes_en_attente: notes.filter((note) => ['en_attente_responsable', 'valide_manager', 'en_attente_rh', 'valide_rh', 'valide_paiement'].includes(note.statut)).length,
    notes_remboursees: notes.filter((note) => note.statut === 'rembourse').length,
    total_mois: Number(totalMonth.toFixed(2)),
  };

  if (user.role === 'RH') {
    const pending_notes = state.notes.filter((note) => ['valide_manager', 'en_attente_rh', 'valide_rh', 'valide_paiement'].includes(note.statut));
    const departementsMap = new Map<string, number>();
    pending_notes.forEach((note) => {
      const key = note.employe?.departement ?? 'Non renseigne';
      departementsMap.set(key, (departementsMap.get(key) ?? 0) + Number(note.total_note));
    });
    return {
      summary,
      pending_notes,
      departements: Array.from(departementsMap.entries()).map(([departement, montant_total]) => ({ departement, montant_total })),
    };
  }

  return {
    summary,
    recent_notes: [...notes].sort((left, right) => right.date_creation.localeCompare(left.date_creation)).slice(0, 5),
  };
}

function getNotificationsForUser(user: User) {
  return getState().notifications
    .filter((notification) => notification.user_email === user.email)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function changeStatusLocally(state: MockState, note: NoteDeFrais, actor: User, payload: Record<string, unknown>) {
  const action = String(payload.action ?? '');
  const commentaire = typeof payload.commentaire === 'string' ? payload.commentaire : null;

  if (action === 'approuve_manager') {
    note.statut = 'valide_manager';
    note.date_validation_manager = today;
    addHistory(state, note, actor.email, 'approuve_manager', commentaire);
    addNotification(state, {
      user_email: 'rh.app@nf.com',
      type: 'note_approuvee',
      titre: 'Nouvelle note a rembourser',
      message: `${note.titre_mission} a ete validee par le manager.`,
      data: { note_id: note.id },
      est_lue: false,
    });
  } else if (action === 'approuve_rh') {
    note.statut = 'valide_rh';
    addHistory(state, note, actor.email, 'approuve_rh', commentaire);
  } else if (action === 'rembourse') {
    note.statut = 'rembourse';
    note.date_remboursement = String(payload.paiement_effectue_le ?? today);
    note.paiement_effectue_le = String(payload.paiement_effectue_le ?? today);
    note.mode_remboursement = (payload.mode_remboursement as NoteDeFrais['mode_remboursement']) ?? 'virement_salaire';
    note.document_remboursement_path = `mock://reimbursement/${note.id}`;
    addHistory(state, note, actor.email, 'rembourse', commentaire);
    addNotification(state, {
      user_email: note.email_employe,
      type: 'note_remboursee',
      titre: 'Remboursement termine',
      message: `${note.titre_mission} a ete marquee comme remboursee.`,
      data: { note_id: note.id },
      est_lue: false,
    });
  } else if (action === 'refuse') {
    note.statut = 'refuse';
    note.litige_commentaire = commentaire;
    addHistory(state, note, actor.email, 'refuse', commentaire);
    addNotification(state, {
      user_email: note.email_employe,
      type: 'note_refusee',
      titre: 'Note refusee',
      message: commentaire ? `Motif: ${commentaire}` : `${note.titre_mission} a ete refusee.`,
      data: { note_id: note.id },
      est_lue: false,
    });
  } else if (action === 'demande_correction') {
    note.statut = 'a_corriger';
    note.litige_commentaire = commentaire;
    addHistory(state, note, actor.email, 'demande_correction', commentaire);
    addNotification(state, {
      user_email: note.email_employe,
      type: 'note_correction',
      titre: 'Correction demandee',
      message: commentaire ? `Commentaire: ${commentaire}` : `${note.titre_mission} doit etre corrigee.`,
      data: { note_id: note.id },
      est_lue: false,
    });
  } else if (action === 'archiver') {
    note.archived_at = new Date().toISOString();
    addHistory(state, note, actor.email, 'archiver', commentaire);
  } else {
    throw new Error('Action de statut non supportee en mode local.');
  }

  return updateNoteInState(state, note);
}

function buildReportData(user: User) {
  const visibleNotes = getVisibleNotes(user, getState());
  const monthlyMap = new Map<number, number>();
  const departmentMap = new Map<string, number>();
  const employeeMap = new Map<string, { email_employe: string; nb_notes: number; montant_total: number; employe?: { nom?: string; departement?: string | null } }>();

  visibleNotes.forEach((note) => {
    const month = Number(note.date_creation.slice(5, 7));
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + Number(note.total_note));
    const department = note.employe?.departement ?? 'Non renseigne';
    departmentMap.set(department, (departmentMap.get(department) ?? 0) + Number(note.total_note));

    const current = employeeMap.get(note.email_employe) ?? {
      email_employe: note.email_employe,
      nb_notes: 0,
      montant_total: 0,
      employe: { nom: note.employe?.nom, departement: note.employe?.departement ?? null },
    };
    current.nb_notes += 1;
    current.montant_total += Number(note.total_note);
    employeeMap.set(note.email_employe, current);
  });

  return {
    mensuel: Array.from(monthlyMap.entries()).map(([mois, montant_total]) => ({ mois, montant_total })),
    departements: Array.from(departmentMap.entries()).map(([departement, montant_total]) => ({ departement, montant_total })),
    employes: Array.from(employeeMap.values()),
  };
}

export function getMockDashboard(user: User) {
  return cloneDeep(getDashboardData(user));
}

export function getMockNotes(user: User, filters?: Record<string, string>) {
  const params = new Map<string, string>(Object.entries(filters ?? {}));
  return cloneDeep(applyFilters(getVisibleNotes(user, getState()), params));
}

export function getMockManagedUsers(user: User, filters?: Record<string, string>) {
  const normalizedSearch = filters?.search?.toLowerCase().trim() ?? '';
  const activeFilter = filters?.active ?? '';

  let users = getState().users.filter((item) => item.role === 'Employe' && item.email_responsable === user.email);

  if (normalizedSearch) {
    users = users.filter((item) => [item.nom, item.email, item.matricule, item.departement ?? '']
      .some((value) => value.toLowerCase().includes(normalizedSearch)));
  }

  if (activeFilter) {
    users = users.filter((item) => Boolean(item.active !== false) === (activeFilter === 'active'));
  }

  return cloneDeep(users.map((item) => attachUserRelations(getState(), item)));
}

export function getMockNotificationsPreview(user: User) {
  const items = getNotificationsForUser(user).slice(0, 5);
  return {
    unread_count: items.filter((item) => !item.est_lue).length,
    items: cloneDeep(items),
  };
}

export async function mockAdapter(config: MockRequestConfig) {
  const method = (config.method ?? 'get').toLowerCase();
  const { pathname } = parseUrl(config);
  const params = getCombinedParams(config);
  const payload = asObjectPayload(config);
  const state = getState();

  try {
    if (method === 'post' && pathname === '/auth/login') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const pendingRequest = (state.registrationRequests ?? []).find((item) => item.email.toLowerCase() === email);
      if (pendingRequest?.statut === 'en_attente') {
        throw buildMockError(config, 403, 'Votre demande est en attente de validation par l administrateur.');
      }
      if (pendingRequest?.statut === 'refusee') {
        throw buildMockError(config, 403, pendingRequest.commentaire_admin ?? 'Votre demande a ete refusee par l administrateur.');
      }
      const user = state.users.find((item) => item.email.toLowerCase() === email && item.active !== false);
      if (!user) {
        throw buildMockError(config, 401, 'Identifiants invalides.');
      }
      enableFastLocalMode();
      return buildAxiosResponse(config, createAuthResponse(user, true));
    }

    if (method === 'post' && pathname === '/auth/register') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const users = state.users ?? [];
      const registrationRequests = state.registrationRequests ?? [];
      if (users.some((item) => item.email.toLowerCase() === email)) {
        throw buildMockError(config, 422, 'Cet email existe deja.');
      }
      if (registrationRequests.some((item) => item.email.toLowerCase() === email && item.statut === 'en_attente')) {
        throw buildMockError(config, 422, 'Une demande est deja en attente pour cet email.');
      }
      const managerEmail = String(payload.email_responsable ?? '').trim().toLowerCase();
      const manager = users.find((item) => item.email.toLowerCase() === managerEmail && item.role === 'Manager' && item.active !== false);
      if (!manager) {
        throw buildMockError(config, 422, 'Le manager renseigne est introuvable.');
      }
      const admin = users.find((item) => item.role === 'Admin' && item.active !== false);
      if (!admin) {
        throw buildMockError(config, 422, 'Aucun administrateur disponible pour valider la demande.');
      }

      const request: RegistrationRequest = {
        id: state.nextIds.registrationRequest++,
        nom: String(payload.nom ?? '').trim(),
        email,
        email_responsable: manager.email,
        matricule: String(payload.matricule ?? '').trim(),
        departement: String(payload.departement ?? '').trim(),
        requested_password: String(payload.password ?? '').trim() || undefined,
        requested_role: 'Employe',
        statut: 'en_attente',
        created_at: new Date().toISOString(),
        processed_at: null,
        admin: { id: admin.id, nom: admin.nom, email: admin.email },
        commentaire_admin: null,
        access_file_sent_at: null,
      };
      state.registrationRequests = [request, ...(state.registrationRequests ?? [])];
      addNotification(state, {
        user_email: admin.email,
        type: 'registration_request',
        titre: 'Nouvelle demande d inscription',
        message: `${request.nom} attend votre validation administrateur.`,
        data: { registration_request_id: request.id },
        est_lue: false,
      });
      persistState();
      enableFastLocalMode();
      const response: RegistrationRequestResponse = {
        message: 'Demande d inscription envoyee a l administrateur pour validation.',
        request,
      };
      return buildAxiosResponse(config, response);
    }

    if (method === 'post' && pathname === '/auth/logout') {
      return buildAxiosResponse(config, { ok: true });
    }

    const currentUser = ensureAuth(config);

    if (method === 'get' && pathname === '/auth/user') {
      return buildAxiosResponse(config, attachUserRelations(state, currentUser));
    }

    if (method === 'get' && pathname === '/dashboard/overview') {
      return buildAxiosResponse(config, getDashboardData(currentUser));
    }

    if (method === 'get' && pathname === '/dashboard/rh-overview') {
      return buildAxiosResponse(config, getDashboardData(currentUser));
    }

    if (method === 'get' && pathname === '/notes-de-frais') {
      return buildAxiosResponse(config, { data: applyFilters(getVisibleNotes(currentUser, state), params) });
    }

    if (method === 'post' && pathname === '/notes-de-frais') {
      if (currentUser.role !== 'Employe') {
        throw buildMockError(config, 403, 'Seul un employe peut creer une note.');
      }
      const note: NoteDeFrais = normalizeNote(state, {
        id: state.nextIds.note++,
        titre_mission: String(payload.titre_mission ?? 'Nouvelle mission').trim(),
        matricule_employe: currentUser.matricule,
        date_creation: String(payload.date_creation ?? today),
        total_note: '0.00',
        statut: 'brouillon',
        email_employe: currentUser.email,
        email_responsable: currentUser.email_responsable ?? 'manager1.app@nf.com',
        commentaire_employe: String(payload.commentaire_employe ?? ''),
        employe: currentUser,
        responsable: state.users.find((item) => item.email === (currentUser.email_responsable ?? 'manager1.app@nf.com')),
        lignes_depense: [],
        lignesDepense: [],
        historique: [],
      });
      state.notes.unshift(note);

      addNotification(state, {
        user_email: note.email_employe,
        type: 'note_soumise',
        titre: status === 'en_attente_responsable' ? 'Note creee et soumise' : 'Note creee',
        message: status === 'en_attente_responsable'
          ? `Votre note ${note.titre_mission} a ete creee et envoyee au manager pour validation.`
          : `Votre note ${note.titre_mission} a ete creee en brouillon.`,
        data: { note_id: note.id },
        est_lue: false,
      });

      if (status === 'en_attente_responsable') {
        addNotification(state, {
          user_email: note.email_responsable,
          type: 'note_soumise',
          titre: 'Nouvelle note a valider',
          message: `${note.titre_mission} attend votre validation.`,
          data: { note_id: note.id },
          est_lue: false,
        });
      }

      persistState();
      return buildAxiosResponse(config, note, 201);
    }

    const noteIdMatch = pathname.match(/^\/notes-de-frais\/(\d+)$/);
    if (noteIdMatch) {
      const noteId = Number(noteIdMatch[1]);
      const note = state.notes.find((item) => item.id === noteId);
      if (!note || !canAccessNote(currentUser, note)) {
        throw buildMockError(config, 404, 'Note introuvable.');
      }
      if (method === 'get') {
        return buildAxiosResponse(config, normalizeNote(state, note));
      }
      if (method === 'put') {
        if (currentUser.role !== 'Employe' || note.email_employe !== currentUser.email || !['brouillon', 'a_corriger'].includes(note.statut)) {
          throw buildMockError(config, 403, "Cette note n'est plus modifiable.");
        }
        note.titre_mission = String(payload.titre_mission ?? note.titre_mission);
        note.commentaire_employe = String(payload.commentaire_employe ?? note.commentaire_employe ?? '');
        persistState();
        return buildAxiosResponse(config, updateNoteInState(state, note));
      }
      if (method === 'delete') {
        state.notes = state.notes.filter((item) => item.id !== noteId);
        persistState();
        return buildAxiosResponse(config, { ok: true });
      }
    }

    const submitMatch = pathname.match(/^\/notes-de-frais\/(\d+)\/soumettre$/);
    if (method === 'post' && submitMatch) {
      const noteId = Number(submitMatch[1]);
      const note = state.notes.find((item) => item.id === noteId && item.email_employe === currentUser.email);
      if (!note) {
        throw buildMockError(config, 404, 'Note introuvable.');
      }
      if ((note.lignes_depense ?? []).length === 0) {
        throw buildMockError(config, 422, 'Ajoutez au moins une depense avant soumission.');
      }
      note.statut = 'en_attente_responsable';
      note.date_soumission = today;
      addNotification(state, {
        user_email: note.email_responsable,
        type: 'note_soumise',
        titre: 'Note a valider',
        message: `${note.titre_mission} attend votre validation.`,
        data: { note_id: note.id },
        est_lue: false,
      });
      persistState();
      return buildAxiosResponse(config, updateNoteInState(state, note));
    }

    const statusMatch = pathname.match(/^\/notes-de-frais\/(\d+)\/changer-statut$/);
    if (method === 'post' && statusMatch) {
      const noteId = Number(statusMatch[1]);
      const note = state.notes.find((item) => item.id === noteId);
      if (!note || !canAccessNote(currentUser, note)) {
        throw buildMockError(config, 404, 'Note introuvable.');
      }
      const updated = changeStatusLocally(state, note, currentUser, payload);
      persistState();
      return buildAxiosResponse(config, updated);
    }

    const addExpenseMatch = pathname.match(/^\/notes-de-frais\/(\d+)\/lignes$/);
    if (method === 'post' && addExpenseMatch) {
      const noteId = Number(addExpenseMatch[1]);
      const note = state.notes.find((item) => item.id === noteId);
      if (!note || note.email_employe !== currentUser.email) {
        throw buildMockError(config, 404, 'Note introuvable.');
      }
      const expenseId = state.nextIds.expense++;
      const expense: LigneDepense = {
        id: expenseId,
        note_de_frais_id: note.id,
        categorie_id: Number(payload.categorie_id),
        date_depense: String(payload.date_depense ?? today),
        montant: String(payload.montant ?? '0'),
        commentaire: String(payload.commentaire ?? ''),
        justificatif_path: payload.justificatif ? `mock://receipt/${expenseId}` : null,
        categorie: state.categories.find((item) => item.id === Number(payload.categorie_id)),
      };
      note.lignes_depense = [...(note.lignes_depense ?? []), expense];
      persistState();
      return buildAxiosResponse(config, updateNoteInState(state, note));
    }

    const expenseMatch = pathname.match(/^\/lignes-depense\/(\d+)$/);
    if (expenseMatch) {
      const expenseId = Number(expenseMatch[1]);
      const note = state.notes.find((item) => (item.lignes_depense ?? []).some((expense) => expense.id === expenseId));
      const expense = note?.lignes_depense?.find((item) => item.id === expenseId);
      if (!note || !expense) {
        throw buildMockError(config, 404, 'Depense introuvable.');
      }

      if (method === 'post' && params.get('_method') === 'PUT') {
        expense.categorie_id = Number(payload.categorie_id ?? expense.categorie_id);
        expense.date_depense = String(payload.date_depense ?? expense.date_depense);
        expense.montant = String(payload.montant ?? expense.montant);
        expense.commentaire = String(payload.commentaire ?? expense.commentaire ?? '');
        if (payload.justificatif) {
          expense.justificatif_path = `mock://receipt/${expenseId}`;
        }
        persistState();
        return buildAxiosResponse(config, updateNoteInState(state, note));
      }

      if (method === 'delete') {
        note.lignes_depense = (note.lignes_depense ?? []).filter((item) => item.id !== expenseId);
        persistState();
        return buildAxiosResponse(config, updateNoteInState(state, note));
      }
    }

    if (method === 'get' && pathname.match(/^\/lignes-depense\/\d+\/justificatif$/)) {
      return buildAxiosResponse(config, createMockBlob('Justificatif simule NV', 'application/pdf'));
    }

    if (method === 'get' && pathname.match(/^\/notes-de-frais\/\d+\/document-remboursement$/)) {
      return buildAxiosResponse(config, createMockBlob('Document de remboursement simule NV', 'application/pdf'));
    }

    if (method === 'get' && pathname === '/categories-depense') {
      return buildAxiosResponse(config, state.categories);
    }

    if (method === 'get' && pathname === '/notifications/apercu') {
      return buildAxiosResponse(config, getMockNotificationsPreview(currentUser));
    }

    if (method === 'get' && pathname === '/notifications') {
      return buildAxiosResponse(config, { data: getNotificationsForUser(currentUser) });
    }

    if (method === 'patch' && pathname === '/notifications/lues/toutes') {
      state.notifications = state.notifications.map((item) => item.user_email === currentUser.email ? { ...item, est_lue: true } : item);
      persistState();
      return buildAxiosResponse(config, { ok: true });
    }

    const notificationReadMatch = pathname.match(/^\/notifications\/(\d+)\/lue$/);
    if (method === 'patch' && notificationReadMatch) {
      const id = Number(notificationReadMatch[1]);
      state.notifications = state.notifications.map((item) => item.id === id ? { ...item, est_lue: true } : item);
      persistState();
      return buildAxiosResponse(config, { ok: true });
    }

    if (method === 'get' && pathname === '/profile') {
      return buildAxiosResponse(config, attachUserRelations(state, currentUser));
    }

    if (method === 'put' && pathname === '/profile') {
      const target = state.users.find((item) => item.id === currentUser.id);
      if (!target) {
        throw buildMockError(config, 404, 'Profil introuvable.');
      }
      target.nom = String(payload.nom ?? target.nom).trim() || target.nom;
      target.matricule = String(payload.matricule ?? target.matricule).trim() || target.matricule;
      target.departement = String(payload.departement ?? target.departement ?? '').trim() || null;
      persistState();
      return buildAxiosResponse(config, attachUserRelations(state, target));
    }

    if (currentUser.role === 'Admin' && method === 'get' && pathname === '/admin/registration-requests') {
      const requests = state.registrationRequests;
      return buildAxiosResponse(config, requests);
    }

    const registrationFileMatch = pathname.match(/^\/admin\/registration-requests\/(\d+)\/send-access-file$/);
    if (currentUser.role === 'Admin' && registrationFileMatch && method === 'post') {
      const id = Number(registrationFileMatch[1]);
      const request = state.registrationRequests.find((item) => item.id === id);
      if (!request) {
        throw buildMockError(config, 404, 'Demande introuvable.');
      }
      if (request.statut !== 'validee') {
        throw buildMockError(config, 422, 'La demande doit etre validee avant envoi.');
      }
      request.access_file_sent_at = new Date().toISOString();
      addNotification(state, {
        user_email: request.email,
        type: 'registration_approved',
        titre: 'Informations de connexion disponibles',
        message: 'Votre dossier de connexion a ete prepare par l administrateur.',
        data: { registration_request_id: request.id },
        est_lue: false,
      });
      persistState();
      return buildAxiosResponse(config, { message: 'Email simule envoye.', request });
    }

    const registrationDecisionMatch = pathname.match(/^\/admin\/registration-requests\/(\d+)\/decision$/);
    if (currentUser.role === 'Admin' && registrationDecisionMatch && method === 'post') {
      const id = Number(registrationDecisionMatch[1]);
      const request = state.registrationRequests.find((item) => item.id === id);
      if (!request) {
        throw buildMockError(config, 404, 'Demande introuvable.');
      }
      const action = String(payload.action ?? '');
      const commentaire = String(payload.commentaire ?? '').trim() || null;

      if (action === 'approve') {
        request.statut = 'validee';
        request.processed_at = new Date().toISOString();
        request.commentaire_admin = commentaire;
        if (!state.users.some((item) => item.email.toLowerCase() === request.email.toLowerCase())) {
          const approvedUser: User = attachUserRelations(state, {
            id: state.nextIds.user++,
            nom: request.nom,
            email: request.email,
            email_responsable: request.email_responsable,
            role: 'Employe',
            matricule: request.matricule,
            departement: request.departement,
            active: true,
          });
          state.users.push(approvedUser);
        }
        addNotification(state, {
          user_email: request.email,
          type: 'registration_approved',
          titre: 'Inscription validee',
          message: 'Votre compte a ete valide par l administrateur.',
          data: { registration_request_id: request.id },
          est_lue: false,
        });
        persistState();
        return buildAxiosResponse(config, request);
      }

      if (action === 'reject') {
        request.statut = 'refusee';
        request.processed_at = new Date().toISOString();
        request.commentaire_admin = commentaire;
        addNotification(state, {
          user_email: request.email,
          type: 'registration_refused',
          titre: 'Inscription refusee',
          message: commentaire ?? 'Votre demande a ete refusee par l administrateur.',
          data: { registration_request_id: request.id },
          est_lue: false,
        });
        persistState();
        return buildAxiosResponse(config, request);
      }

      throw buildMockError(config, 422, 'Decision manager non supportee.');
    }

    if (currentUser.role === 'Admin' && method === 'get' && pathname === '/admin/users') {
      let users = [...state.users];
      const search = params.get('search')?.toLowerCase().trim();
      const role = params.get('role');
      const active = params.get('active');
      if (search) {
        users = users.filter((item) => [item.nom, item.email, item.matricule].some((value) => value.toLowerCase().includes(search)));
      }
      if (role) users = users.filter((item) => item.role === role);
      if (active) users = users.filter((item) => Boolean(item.active !== false) === (active === 'true'));
      return buildAxiosResponse(config, users.map((item) => attachUserRelations(state, item)));
    }

    if (currentUser.role === 'Manager' && method === 'get' && pathname === '/manager/users') {
      let users = state.users.filter((item) => item.role === 'Employe' && item.email_responsable === currentUser.email);
      const search = params.get('search')?.toLowerCase().trim();
      const active = params.get('active');
      if (search) {
        users = users.filter((item) => [item.nom, item.email, item.matricule].some((value) => value.toLowerCase().includes(search)));
      }
      if (active) users = users.filter((item) => Boolean(item.active !== false) === (active === 'true'));
      return buildAxiosResponse(config, users.map((item) => attachUserRelations(state, item)));
    }

    if (currentUser.role === 'Manager' && method === 'post' && pathname === '/manager/users') {
      const user: User = attachUserRelations(state, {
        id: state.nextIds.user++,
        nom: String(payload.nom ?? ''),
        email: String(payload.email ?? '').toLowerCase(),
        email_responsable: currentUser.email,
        role: 'Employe',
        matricule: String(payload.matricule ?? ''),
        departement: String(payload.departement ?? '') || null,
        active: Boolean(payload.active ?? true),
      });
      state.users.push(user);
      persistState();
      return buildAxiosResponse(config, user, 201);
    }

    const managerUserMatch = pathname.match(/^\/manager\/users\/(\d+)$/);
    if (currentUser.role === 'Manager' && managerUserMatch && method === 'put') {
      const id = Number(managerUserMatch[1]);
      const user = state.users.find((item) => item.id === id && item.role === 'Employe' && item.email_responsable === currentUser.email);
      if (!user) {
        throw buildMockError(config, 404, 'Collaborateur introuvable.');
      }
      user.nom = String(payload.nom ?? user.nom);
      user.email = String(payload.email ?? user.email).toLowerCase();
      user.role = 'Employe';
      user.matricule = String(payload.matricule ?? user.matricule);
      user.departement = String(payload.departement ?? user.departement ?? '') || null;
      user.email_responsable = currentUser.email;
      user.active = Boolean(payload.active ?? user.active ?? true);
      persistState();
      return buildAxiosResponse(config, attachUserRelations(state, user));
    }

    const managerActiveMatch = pathname.match(/^\/manager\/users\/(\d+)\/active$/);
    if (currentUser.role === 'Manager' && managerActiveMatch && method === 'patch') {
      const id = Number(managerActiveMatch[1]);
      const user = state.users.find((item) => item.id === id && item.role === 'Employe' && item.email_responsable === currentUser.email);
      if (!user) {
        throw buildMockError(config, 404, 'Collaborateur introuvable.');
      }
      user.active = Boolean(payload.active);
      persistState();
      return buildAxiosResponse(config, attachUserRelations(state, user));
    }

    if (currentUser.role === 'Admin' && method === 'post' && pathname === '/admin/users') {
      const role = String(payload.role ?? 'Employe') as User['role'];
      const user: User = attachUserRelations(state, {
        id: state.nextIds.user++,
        nom: String(payload.nom ?? ''),
        email: String(payload.email ?? '').toLowerCase(),
        email_responsable: role === 'Employe' ? String(payload.email_responsable ?? '') || null : null,
        role,
        matricule: String(payload.matricule ?? ''),
        departement: String(payload.departement ?? '') || null,
        active: Boolean(payload.active ?? true),
      });
      state.users.push(user);
      persistState();
      return buildAxiosResponse(config, user, 201);
    }

    const adminUserMatch = pathname.match(/^\/admin\/users\/(\d+)$/);
    if (currentUser.role === 'Admin' && adminUserMatch && method === 'put') {
      const id = Number(adminUserMatch[1]);
      const user = state.users.find((item) => item.id === id);
      if (!user) {
        throw buildMockError(config, 404, 'Utilisateur introuvable.');
      }
      user.nom = String(payload.nom ?? user.nom);
      user.email = String(payload.email ?? user.email).toLowerCase();
      user.role = String(payload.role ?? user.role) as User['role'];
      user.matricule = String(payload.matricule ?? user.matricule);
      user.departement = String(payload.departement ?? user.departement ?? '') || null;
      user.email_responsable = user.role === 'Employe' ? String(payload.email_responsable ?? user.email_responsable ?? '') || null : null;
      user.active = Boolean(payload.active ?? user.active ?? true);
      persistState();
      return buildAxiosResponse(config, attachUserRelations(state, user));
    }
    if (currentUser.role === 'Admin' && adminUserMatch && method === 'delete') {
      const id = Number(adminUserMatch[1]);
      if (id === currentUser.id) {
        throw buildMockError(config, 422, 'Vous ne pouvez pas supprimer votre propre compte.');
      }

      const user = state.users.find((item) => item.id === id);
      if (!user) {
        throw buildMockError(config, 404, 'Utilisateur introuvable.');
      }

      const managesNotes = state.notes.some((note) => note.email_responsable === user.email);
      if (managesNotes) {
        throw buildMockError(config, 422, 'Impossible de supprimer ce compte car il est encore responsable de notes de frais.');
      }

      const hasApprovalHistory = state.notes.some((note) => (note.historique ?? []).some((entry) => entry.validateur_email === user.email));
      if (hasApprovalHistory) {
        throw buildMockError(config, 422, 'Impossible de supprimer ce compte car il apparait dans l historique des validations.');
      }

      state.users = state.users
        .filter((item) => item.id !== id)
        .map((item) => item.email_responsable === user.email ? { ...item, email_responsable: null, responsable: null } : item);
      state.registrationRequests = state.registrationRequests.filter((item) => item.email !== user.email && item.email_responsable !== user.email);
      state.notifications = state.notifications.filter((item) => item.user_email !== user.email);
      state.reportConfigurations = state.reportConfigurations.filter((item) => item.created_by_user_id !== id);
      persistState();
      return buildAxiosResponse(config, { message: 'Compte supprime avec succes.' });
    }

    const adminActiveMatch = pathname.match(/^\/admin\/users\/(\d+)\/active$/);
    if (currentUser.role === 'Admin' && adminActiveMatch && method === 'patch') {
      const id = Number(adminActiveMatch[1]);
      const user = state.users.find((item) => item.id === id);
      if (!user) {
        throw buildMockError(config, 404, 'Utilisateur introuvable.');
      }
      user.active = Boolean(payload.active);
      persistState();
      return buildAxiosResponse(config, attachUserRelations(state, user));
    }

    const impersonationMatch = pathname.match(/^\/admin\/users\/(\d+)\/impersonate$/);
    if (currentUser.role === 'Admin' && impersonationMatch && method === 'post') {
      const id = Number(impersonationMatch[1]);
      const user = state.users.find((item) => item.id === id);
      if (!user) {
        throw buildMockError(config, 404, 'Utilisateur introuvable.');
      }
      return buildAxiosResponse(config, createAuthResponse(user, true));
    }

    if (currentUser.role === 'Admin' && method === 'post' && pathname === '/admin/notes-de-frais') {
      const employeeEmail = String(payload.email_employe ?? '').trim();
      const employee = state.users.find((item) => item.email === employeeEmail);
      if (!employee) {
        throw buildMockError(config, 404, 'Employe introuvable.');
      }

      const managerEmail = String(payload.email_responsable ?? employee.email_responsable ?? '').trim();
      const note: NoteDeFrais = normalizeNote(state, {
        id: state.nextIds.note++,
        titre_mission: String(payload.titre_mission ?? 'Nouvelle mission').trim(),
        matricule_employe: employee.matricule,
        date_creation: String(payload.date_creation ?? today),
        total_note: '0.00',
        statut: 'brouillon',
        email_employe: employee.email,
        email_responsable: managerEmail,
        commentaire_employe: String(payload.commentaire_employe ?? ''),
        employe: employee,
        responsable: state.users.find((item) => item.email === managerEmail),
        lignes_depense: [],
        lignesDepense: [],
        historique: [],
      });

      addHistory(state, note, currentUser.email, 'admin_update', String(payload.justification ?? 'Creation admin'));
      state.notes.unshift(note);
      persistState();
      return buildAxiosResponse(config, note, 201);
    }

    const adminNoteMatch = pathname.match(/^\/admin\/notes-de-frais\/(\d+)$/);
    if (currentUser.role === 'Admin' && adminNoteMatch) {
      const noteId = Number(adminNoteMatch[1]);
      const note = state.notes.find((item) => item.id === noteId);
      if (!note) {
        throw buildMockError(config, 404, 'Note introuvable.');
      }

      if (method === 'put') {
        const employeeEmail = String(payload.email_employe ?? note.email_employe).trim();
        const employee = state.users.find((item) => item.email === employeeEmail);
        if (!employee) {
          throw buildMockError(config, 404, 'Employe introuvable.');
        }

        const managerEmail = String(payload.email_responsable ?? employee.email_responsable ?? note.email_responsable ?? '').trim();
        note.titre_mission = String(payload.titre_mission ?? note.titre_mission).trim() || note.titre_mission;
        note.date_creation = String(payload.date_creation ?? note.date_creation);
        note.commentaire_employe = String(payload.commentaire_employe ?? note.commentaire_employe ?? '');
        note.email_employe = employee.email;
        note.matricule_employe = employee.matricule;
        note.email_responsable = managerEmail;
        note.employe = employee;
        note.responsable = state.users.find((item) => item.email === managerEmail);
        addHistory(state, note, currentUser.email, 'admin_update', 'Modification admin');
        persistState();
        return buildAxiosResponse(config, updateNoteInState(state, note));
      }

      if (method === 'delete') {
        state.notes = state.notes.filter((item) => item.id !== noteId);
        persistState();
        return buildAxiosResponse(config, { message: 'Note supprimee' });
      }
    }

    if (currentUser.role === 'Admin' && method === 'get' && pathname === '/admin/parametres') {
      return buildAxiosResponse(config, state.parametres);
    }

    const adminParamMatch = pathname.match(/^\/admin\/parametres\/(\d+)$/);
    if (currentUser.role === 'Admin' && adminParamMatch && method === 'put') {
      const id = Number(adminParamMatch[1]);
      const param = state.parametres.find((item) => item.id === id);
      if (!param) {
        throw buildMockError(config, 404, 'Parametre introuvable.');
      }
      param.valeur = String(payload.valeur ?? param.valeur);
      param.description = String(payload.description ?? param.description ?? '');
      persistState();
      return buildAxiosResponse(config, param);
    }

    if (currentUser.role === 'Admin' && method === 'post' && pathname === '/admin/categories-depense') {
      const category: CategorieDepense = {
        id: state.categories.length + 1,
        nom: String(payload.nom ?? ''),
        code: String(payload.code ?? '').toUpperCase(),
        plafond_journalier: payload.plafond_journalier == null ? null : String(payload.plafond_journalier),
        justificatif_obligatoire: Boolean(payload.justificatif_obligatoire),
        active: Boolean(payload.active ?? true),
      };
      state.categories.push(category);
      persistState();
      return buildAxiosResponse(config, category, 201);
    }

    const adminCategoryMatch = pathname.match(/^\/admin\/categories-depense\/(\d+)$/);
    if (currentUser.role === 'Admin' && adminCategoryMatch) {
      const id = Number(adminCategoryMatch[1]);
      const category = state.categories.find((item) => item.id === id);
      if (!category) {
        throw buildMockError(config, 404, 'Categorie introuvable.');
      }
      if (method === 'put') {
        category.nom = String(payload.nom ?? category.nom);
        category.code = String(payload.code ?? category.code).toUpperCase();
        category.plafond_journalier = payload.plafond_journalier == null ? null : String(payload.plafond_journalier);
        category.justificatif_obligatoire = Boolean(payload.justificatif_obligatoire ?? category.justificatif_obligatoire);
        category.active = Boolean(payload.active ?? category.active);
        persistState();
        return buildAxiosResponse(config, category);
      }
      if (method === 'delete') {
        category.active = false;
        persistState();
        return buildAxiosResponse(config, { ok: true });
      }
    }

    const reportData = buildReportData(currentUser);

    if (method === 'get' && pathname === '/rapports/mensuels') {
      return buildAxiosResponse(config, reportData.mensuel);
    }
    if (method === 'get' && pathname === '/rapports/departements') {
      return buildAxiosResponse(config, reportData.departements);
    }
    if (method === 'get' && pathname === '/rapports/employes') {
      return buildAxiosResponse(config, reportData.employes);
    }
    if (method === 'get' && pathname === '/rapports/equipe') {
      const total_depenses = reportData.employes.reduce((sum, item) => sum + item.montant_total, 0);
      const notes_traitees = getVisibleNotes(currentUser, state).filter((note) => note.statut !== 'brouillon').length;
      return buildAxiosResponse(config, {
        summary: {
          total_depenses,
          notes_traitees,
          moyenne_par_note: notes_traitees > 0 ? total_depenses / notes_traitees : 0,
        },
        delai_moyen_traitement_jours: 1,
        taux_approbation: reportData.employes.map((item) => ({
          email_employe: item.email_employe,
          nom: item.employe?.nom,
          taux_approbation: 92,
        })),
      });
    }
    if (method === 'get' && pathname === '/rapports/globaux') {
      return buildAxiosResponse(config, {
        total_mois: reportData.mensuel.find((item) => item.mois === Number(today.slice(5, 7)))?.montant_total ?? 0,
        total_annee: reportData.mensuel.reduce((sum, item) => sum + item.montant_total, 0),
        top_employes: [...reportData.employes]
          .sort((left, right) => right.montant_total - left.montant_total)
          .slice(0, 5)
          .map((item) => ({
            email_employe: item.email_employe,
            montant_total: item.montant_total,
            employe: { nom: item.employe?.nom },
          })),
        repartition_categories: state.categories.map((category) => ({
          categorie: category.nom,
          montant_total: state.notes.reduce(
            (sum, note) =>
              sum +
              (note.lignes_depense ?? [])
                .filter((expense) => expense.categorie_id === category.id)
                .reduce((inner, expense) => inner + Number(expense.montant), 0),
            0,
          ),
        })),
      });
    }

    const { reportColumns, rows } = buildReportRows(state, currentUser);

    const reportFilters: ReportFilterResponse = {
      statuts: [
        { value: '', label: 'Tous' },
        { value: 'brouillon', label: 'Brouillon' },
        { value: 'en_attente_responsable', label: 'En attente responsable' },
        { value: 'rembourse', label: 'Rembourse' },
      ],
      departements: Array.from(new Set(state.users.map((item) => item.departement).filter(Boolean))).map((item) => ({ value: String(item), label: String(item) })),
      managers: state.users.filter((item) => item.role === 'Manager').map((item) => ({ value: item.email, label: item.nom })),
      employes: state.users.filter((item) => item.role === 'Employe').map((item) => ({ value: item.email, label: item.nom })),
      sorts: [
        { value: 'date_creation', label: 'Date' },
        { value: 'total_note', label: 'Montant' },
      ],
      formats: [
        { value: 'json', label: 'JSON' },
        { value: 'pdf', label: 'PDF' },
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx', label: 'XLSX' },
      ],
    };

    if (method === 'get' && pathname === '/rapports/colonnes') {
      return buildAxiosResponse(config, reportColumns);
    }
    if (method === 'get' && pathname === '/rapports/filtres') {
      return buildAxiosResponse(config, reportFilters);
    }
    if (method === 'get' && pathname === '/rapports/configurations') {
      return buildAxiosResponse(config, state.reportConfigurations);
    }
    if (method === 'post' && pathname === '/rapports/sauvegarder') {
      const existingId = payload.id ? Number(payload.id) : null;
      const existing = existingId ? state.reportConfigurations.find((item) => item.id === existingId) : null;
      const configuration: SavedReportConfiguration = existing ?? {
        id: state.nextIds.reportConfiguration++,
        nom: '',
        description: '',
        configuration: payload.configuration as SavedReportConfiguration['configuration'],
        created_by_user_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: currentUser.id, nom: currentUser.nom, email: currentUser.email },
      };
      configuration.nom = String(payload.nom ?? configuration.nom);
      configuration.description = String(payload.description ?? configuration.description ?? '');
      configuration.configuration = payload.configuration as SavedReportConfiguration['configuration'];
      configuration.updated_at = new Date().toISOString();
      if (!existing) {
        state.reportConfigurations.unshift(configuration);
      }
      persistState();
      return buildAxiosResponse(config, configuration);
    }

    const reportConfigMatch = pathname.match(/^\/rapports\/configurations\/(\d+)$/);
    if (reportConfigMatch && method === 'delete') {
      const id = Number(reportConfigMatch[1]);
      state.reportConfigurations = state.reportConfigurations.filter((item) => item.id !== id);
      persistState();
      return buildAxiosResponse(config, { ok: true });
    }

    if (method === 'post' && pathname === '/rapports/generer') {
      const allColumns = reportColumns.groupes.flatMap((group) => group.colonnes);
      const requestedColumns = Array.isArray(payload.columns) ? payload.columns.map((item) => String(item)) : reportColumns.default;
      const activeColumns = allColumns.filter((column) => requestedColumns.includes(column.key));
      const preview: ReportPreviewResponse = {
        columns: activeColumns.length > 0 ? activeColumns : allColumns.filter((column) => reportColumns.default.includes(column.key)),
        rows,
        summary: {
          count: rows.length,
          total_amount: rows.reduce((sum, row) => sum + Number(row.total_note), 0),
          average_amount: rows.length ? rows.reduce((sum, row) => sum + Number(row.total_note), 0) / rows.length : 0,
          reimbursed_count: rows.filter((row) => row.statut === 'rembourse').length,
          pending_count: rows.filter((row) => row.statut !== 'rembourse').length,
        },
        charts: {
          categories: state.categories.map((category) => ({
            label: category.nom,
            value: rows.length * 10,
          })),
          months: reportData.mensuel.map((item) => ({
            label: String(item.mois),
            value: item.montant_total,
          })),
        },
        meta: {
          page: 1,
          per_page: 20,
          total: rows.length,
          total_pages: 1,
        },
      };

      if (config.responseType === 'blob') {
        const format = String(payload.format ?? 'pdf');
        if (format === 'csv') {
          return buildAxiosResponse(config, createCsvExportBlob(preview.columns, preview.rows));
        }

        if (format === 'xlsx') {
          return buildAxiosResponse(config, createExcelExportBlob(preview.columns, preview.rows));
        }

        return buildAxiosResponse(config, createPdfExportBlob(buildPdfExportLines(preview)));
      }

      return buildAxiosResponse(config, preview);
    }

    throw buildMockError(config, 404, `Endpoint local non supporte: ${method.toUpperCase()} ${pathname}`);
  } catch (error) {
    if (error instanceof AxiosError) {
      throw error;
    }

    throw buildMockError(config, 500, error instanceof Error ? error.message : 'Erreur locale inconnue.');
  }
}

export function shouldFallbackToLocal(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const token = getTokenFromConfig(error.config) ?? (canUseStorage() ? window.localStorage.getItem('token') : null);
  if (!canUseMockModeForToken(token)) {
    return false;
  }

  if (!error.response) {
    enableFastLocalMode();
    return true;
  }

  return error.code === 'ECONNABORTED' || error.response.status === 404;
}

export async function buildMockResponse(config: MockRequestConfig) {
  const token = getTokenFromConfig(config) ?? (canUseStorage() ? window.localStorage.getItem('token') : null);
  if (canUseMockModeForToken(token)) {
    enableFastLocalMode();
  }
  return mockAdapter(config);
}

export function prefersMockFromConfig(config: AxiosRequestConfig) {
  return shouldHandleLocally(config);
}
