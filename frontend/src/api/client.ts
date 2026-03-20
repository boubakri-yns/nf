import axios from 'axios';
import { buildMockResponse, prefersMockFromConfig, shouldFallbackToLocal } from './localApi';

const envApiUrl = import.meta.env.VITE_API_URL;
const DEFAULT_TIMEOUT_MS = 1500;
const BACKEND_ONLY_TIMEOUT_MS = 10000;
const SLOW_READ_TIMEOUT_MS = 10000;

const localApiCandidates = ['http://localhost:8000/api', 'http://localhost:8001/api'];

const buildApiCandidates = () => {
  const candidates = new Set<string>();

  if (envApiUrl) {
    candidates.add(envApiUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;

    if (hostname) {
      candidates.add(`${protocol}//${hostname}:8000/api`);
      candidates.add(`${protocol}//${hostname}:8001/api`);
    }
  }

  localApiCandidates.forEach((candidate) => candidates.add(candidate));

  return Array.from(candidates);
};

const apiCandidates = buildApiCandidates();

const resolveInitialBaseUrl = () => {
  return apiCandidates[0] ?? localApiCandidates[0];
};

let activeBaseUrl = resolveInitialBaseUrl();

const getConfigPathname = (url?: string) => {
  const rawUrl = url ?? '/';
  const parsed = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://local.api');
  return parsed.pathname.replace(/\/api$/, '') || '/';
};

const isPersistentServerRoute = (url?: string) => {
  const pathname = getConfigPathname(url);

  return pathname.startsWith('/notes-de-frais')
    || pathname.startsWith('/lignes-depense')
    || pathname === '/categories-depense'
    || pathname === '/dashboard/overview'
    || pathname === '/dashboard/rh-overview';
};

const isBackendOnlyRoute = (url?: string, method?: string) => {
  const pathname = getConfigPathname(url);
  const normalizedMethod = (method ?? 'get').toLowerCase();

  if (isPersistentServerRoute(url)) {
    return true;
  }

  if (normalizedMethod !== 'get') {
    return true;
  }

  if (pathname === '/auth/login' || pathname === '/auth/register' || pathname === '/auth/user' || pathname === '/auth/logout') {
    return true;
  }

  if (pathname === '/profile') {
    return true;
  }

  return pathname.startsWith('/admin/registration-requests');
};

const getTimeoutForRoute = (url?: string, method?: string) => {
  const pathname = getConfigPathname(url);
  const normalizedMethod = (method ?? 'get').toLowerCase();

  if (isBackendOnlyRoute(url, method)) {
    return BACKEND_ONLY_TIMEOUT_MS;
  }

  if (normalizedMethod === 'get' && (pathname === '/categories-depense' || /^\/notes-de-frais\/\d+$/.test(pathname))) {
    return SLOW_READ_TIMEOUT_MS;
  }

  return DEFAULT_TIMEOUT_MS;
};

const getNextFallbackBaseUrl = (attemptedBaseUrls: string[]) => {
  return apiCandidates.find((candidate) => !attemptedBaseUrls.includes(candidate)) ?? null;
};

const getRouteNotFoundMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const message = error.response?.data?.message;
  return typeof message === 'string' ? message.toLowerCase() : null;
};

const shouldRetryWithFallback = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  const routeMessage = getRouteNotFoundMessage(error);
  return error.response.status === 404 && routeMessage?.includes('route api/') === true;
};

export const api = axios.create({
  baseURL: activeBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.timeout = getTimeoutForRoute(config.url, config.method);

  if (!isPersistentServerRoute(config.url) && prefersMockFromConfig(config)) {
    config.adapter = async () => buildMockResponse(config);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { __attemptedBaseUrls?: string[] }) | undefined;

    if (config && !isPersistentServerRoute(config.url) && shouldFallbackToLocal(error)) {
      return buildMockResponse(config);
    }

    if (!config || !shouldRetryWithFallback(error)) {
      return Promise.reject(error);
    }

    const attemptedBaseUrls = config.__attemptedBaseUrls ?? [config.baseURL ?? activeBaseUrl];
    const fallbackBaseUrl = getNextFallbackBaseUrl(attemptedBaseUrls);

    if (!fallbackBaseUrl) {
      return Promise.reject(error);
    }

    config.__attemptedBaseUrls = [...attemptedBaseUrls, fallbackBaseUrl];
    activeBaseUrl = fallbackBaseUrl;
    api.defaults.baseURL = fallbackBaseUrl;
    config.baseURL = fallbackBaseUrl;

    return api.request(config);
  }
);
