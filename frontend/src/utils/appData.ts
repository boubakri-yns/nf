import { api } from '../api/client';
import { getMockDashboard, getMockNotes, getMockNotificationsPreview, shouldMockImmediately } from '../api/localApi';
import type { CategorieDepense, NoteDeFrais, NotificationItem, User } from '../types';
import { readCache, updateCacheByPrefix, writeCache } from './queryCache';

export const defaultNotesFilters = {
  statut: '',
  search: '',
  emailEmploye: '',
  emailResponsable: '',
  departement: '',
  dateDebut: '',
  dateFin: '',
  montantMin: '',
  montantMax: '',
  sort: 'date_creation',
  direction: 'desc',
};

export interface DashboardCacheValue {
  overview: {
    summary: {
      total_notes: number;
      notes_en_cours: number;
      notes_en_attente: number;
      notes_remboursees: number;
      total_mois: number;
    };
    recent_notes: NoteDeFrais[];
  } | null;
  pendingRhNotes: NoteDeFrais[];
  departements: Array<{ departement: string; montant_total: number }>;
}

export interface NotificationPreviewCacheValue {
  unread_count: number;
  items: NotificationItem[];
}

const DASHBOARD_TTL_MS = 45_000;
const NOTES_LIST_TTL_MS = 45_000;
const NOTE_DETAIL_TTL_MS = 45_000;
const NOTIFICATIONS_TTL_MS = 20_000;
const CATEGORIES_TTL_MS = 5 * 60_000;

export function getDashboardCacheKey(user: Pick<User, 'role' | 'email'>) {
  return `dashboard:${user.role}:${user.email}`;
}

export function getNotesListCacheKey(user: Pick<User, 'role' | 'email'>, filters = defaultNotesFilters) {
  return `notes-list:${user.role}:${user.email}:${JSON.stringify(filters)}`;
}

export function getNoteDetailCacheKey(noteId: string | number) {
  return `notes:detail:${noteId}`;
}

export function getCategoriesCacheKey() {
  return 'categories:list';
}

export function getNotificationsPreviewCacheKey() {
  return 'notifications:preview';
}

export function getNotificationsListCacheKey() {
  return 'notifications:list';
}

export async function prefetchDashboard(user: User) {
  const cacheKey = getDashboardCacheKey(user);
  if (readCache(cacheKey)) {
    return;
  }

  if (shouldMockImmediately(localStorage.getItem('token'))) {
    const data = getMockDashboard(user);
    if (user.role === 'RH') {
      writeCache(cacheKey, {
        overview: {
          summary: data.summary,
          recent_notes: [],
        },
        pendingRhNotes: data.pending_notes,
        departements: data.departements,
      }, DASHBOARD_TTL_MS);
      return;
    }

    writeCache(cacheKey, {
      overview: data,
      pendingRhNotes: [],
      departements: [],
    }, DASHBOARD_TTL_MS);
    return;
  }

  if (user.role === 'RH') {
    const { data } = await api.get('/dashboard/rh-overview');
    writeCache(cacheKey, {
      overview: {
        summary: data.summary,
        recent_notes: [],
      },
      pendingRhNotes: data.pending_notes,
      departements: data.departements,
    }, DASHBOARD_TTL_MS);
    return;
  }

  if (user.role === 'Admin') {
    return;
  }

  const { data } = await api.get('/dashboard/overview');
  writeCache(cacheKey, {
    overview: data,
    pendingRhNotes: [],
    departements: [],
  }, DASHBOARD_TTL_MS);
}

export async function prefetchNotesList(user: User) {
  const cacheKey = getNotesListCacheKey(user);
  if (readCache(cacheKey)) {
    return;
  }

  if (shouldMockImmediately(localStorage.getItem('token'))) {
    writeCache(cacheKey, getMockNotes(user), NOTES_LIST_TTL_MS);
    return;
  }

  const { data } = await api.get<{ data?: NoteDeFrais[] }>('/notes-de-frais', {
    params: {
      sort: defaultNotesFilters.sort,
      direction: defaultNotesFilters.direction,
    },
  });

  writeCache(cacheKey, data.data ?? [], NOTES_LIST_TTL_MS);
}

export function prefetchNotificationsPreview(user: User) {
  if (readCache(getNotificationsPreviewCacheKey())) {
    return;
  }

  if (!shouldMockImmediately(localStorage.getItem('token'))) {
    return;
  }

  writeCache(getNotificationsPreviewCacheKey(), getMockNotificationsPreview(user), NOTIFICATIONS_TTL_MS);
}

export async function prefetchCategories() {
  if (readCache<CategorieDepense[]>(getCategoriesCacheKey())) {
    return;
  }

  const { data } = await api.get<CategorieDepense[]>('/categories-depense');
  writeCache(getCategoriesCacheKey(), data, CATEGORIES_TTL_MS);
}

export async function prefetchNoteDetail(noteId: number | string) {
  const cacheKey = getNoteDetailCacheKey(noteId);
  if (readCache<NoteDeFrais>(cacheKey)) {
    return;
  }

  const { data } = await api.get<NoteDeFrais>(`/notes-de-frais/${noteId}`);
  cacheNoteDetail(data);
}

export function cacheNoteDetail(note: NoteDeFrais) {
  writeCache(getNoteDetailCacheKey(note.id), note, NOTE_DETAIL_TTL_MS);
}

export function cacheNotificationsPreview(data: NotificationPreviewCacheValue) {
  writeCache(getNotificationsPreviewCacheKey(), data, NOTIFICATIONS_TTL_MS);
}

export function cacheNotificationsList(items: NotificationItem[]) {
  writeCache(getNotificationsListCacheKey(), items, NOTIFICATIONS_TTL_MS);
}

export function mergeUniqueNotes(...collections: Array<NoteDeFrais[] | null | undefined>) {
  const map = new Map<number, NoteDeFrais>();

  collections
    .flatMap((items) => items ?? [])
    .forEach((note) => {
      map.set(note.id, { ...(map.get(note.id) ?? {}), ...note });
    });

  return Array.from(map.values()).sort((left, right) => {
    if (left.date_creation === right.date_creation) {
      return right.id - left.id;
    }

    return String(right.date_creation).localeCompare(String(left.date_creation));
  });
}

export function canUserSeeNote(role: string, email: string, note: NoteDeFrais) {
  const lowerEmail = email.toLowerCase();

  return role === 'Admin'
    || role === 'RH'
    || (role === 'Manager' && (
      note.email_responsable.toLowerCase() === lowerEmail
      || note.employe?.email_responsable?.toLowerCase() === lowerEmail
    ))
    || (role === 'Employe' && note.email_employe.toLowerCase() === lowerEmail);
}

export function syncNoteInCachedCollections(note: NoteDeFrais) {
  cacheNoteDetail(note);

  updateCacheByPrefix<NoteDeFrais[]>('notes-list:', (items, key) => {
    const match = key.match(/^notes-list:([^:]+):([^:]+):(.*)$/);
    if (!match) {
      return items;
    }

    const [, role, email, rawFilters] = match;

    let filters = defaultNotesFilters;
    try {
      filters = { ...defaultNotesFilters, ...(JSON.parse(rawFilters) as Partial<typeof defaultNotesFilters>) };
    } catch {
      filters = defaultNotesFilters;
    }

    const canSeeNote = canUserSeeNote(role, email, note);

    const matchesFilters =
      (!filters.statut || note.statut === filters.statut)
      && (!filters.search || [note.titre_mission, note.email_employe, note.email_responsable, note.matricule_employe]
        .some((value) => value?.toLowerCase().includes(filters.search.toLowerCase().trim())))
      && (!filters.emailEmploye || note.email_employe.toLowerCase().includes(filters.emailEmploye.toLowerCase().trim()))
      && (!filters.emailResponsable || note.email_responsable.toLowerCase().includes(filters.emailResponsable.toLowerCase().trim()))
      && (!filters.departement || note.employe?.departement?.toLowerCase().includes(filters.departement.toLowerCase().trim()))
      && (!filters.dateDebut || note.date_creation >= filters.dateDebut)
      && (!filters.dateFin || note.date_creation <= filters.dateFin)
      && (!filters.montantMin || Number(note.total_note) >= Number(filters.montantMin))
      && (!filters.montantMax || Number(note.total_note) <= Number(filters.montantMax));

    const existing = items.find((item) => item.id === note.id);
    const nextItems = items
      .map((item) => (item.id === note.id ? { ...item, ...note } : item))
      .filter((item) => item.id !== note.id || (canSeeNote && matchesFilters));

    if (!existing && canSeeNote && matchesFilters) {
      nextItems.unshift(note);
    }

    return nextItems;
  });

  updateCacheByPrefix<DashboardCacheValue>('dashboard:', (value) => {
    if (!value.overview) {
      return value;
    }

    return {
      ...value,
      overview: {
        ...value.overview,
        recent_notes: value.overview.recent_notes.map((item) => (
          item.id === note.id
            ? { ...item, ...note }
            : item
        )),
      },
      pendingRhNotes: value.pendingRhNotes.map((item) => (
        item.id === note.id
          ? { ...item, ...note }
          : item
      )),
    };
  });
}

export function removeNoteFromCachedCollections(noteId: number) {
  updateCacheByPrefix<NoteDeFrais[]>('notes-list:', (items) => items.filter((item) => item.id !== noteId));
  updateCacheByPrefix<DashboardCacheValue>('dashboard:', (value) => ({
    ...value,
    overview: value.overview
      ? {
          ...value.overview,
          recent_notes: value.overview.recent_notes.filter((item) => item.id !== noteId),
        }
      : value.overview,
    pendingRhNotes: value.pendingRhNotes.filter((item) => item.id !== noteId),
  }));
}

export function prependNoteToCachedCollections(note: NoteDeFrais, user: Pick<User, 'role' | 'email'>) {
  cacheNoteDetail(note);

  const defaultListKey = getNotesListCacheKey(user);
  const currentList = readCache<NoteDeFrais[]>(defaultListKey);
  writeCache(defaultListKey, mergeUniqueNotes([note], currentList ?? []), NOTES_LIST_TTL_MS);

  const dashboardKey = getDashboardCacheKey(user);
  const currentDashboard = readCache<DashboardCacheValue>(dashboardKey);
  if (currentDashboard?.overview) {
    writeCache(dashboardKey, {
      ...currentDashboard,
      overview: {
        ...currentDashboard.overview,
        summary: {
          ...currentDashboard.overview.summary,
          total_notes: currentDashboard.overview.summary.total_notes + 1,
          notes_en_cours: currentDashboard.overview.summary.notes_en_cours + 1,
        },
        recent_notes: mergeUniqueNotes([note], currentDashboard.overview.recent_notes).slice(0, 5),
      },
    }, DASHBOARD_TTL_MS);
  }
}
