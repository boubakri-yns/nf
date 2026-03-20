import { api } from './client';
import type {
  ReportColumnResponse,
  ReportConfigPayload,
  ReportFilterResponse,
  ReportPreviewResponse,
  SavedReportConfiguration,
} from '../types';

export const rapportsApi = {
  async getColonnes() {
    const response = await api.get<ReportColumnResponse>('/rapports/colonnes');
    return response.data;
  },

  async getFiltres() {
    const response = await api.get<ReportFilterResponse>('/rapports/filtres');
    return response.data;
  },

  async getConfigurations() {
    const response = await api.get<SavedReportConfiguration[]>('/rapports/configurations');
    return response.data;
  },

  async sauvegarderConfiguration(payload: {
    id?: number;
    nom: string;
    description?: string;
    configuration: ReportConfigPayload;
  }) {
    const response = await api.post<SavedReportConfiguration>('/rapports/sauvegarder', payload);
    return response.data;
  },

  async supprimerConfiguration(id: number) {
    await api.delete(`/rapports/configurations/${id}`);
  },

  async generer(payload: ReportConfigPayload) {
    const response = await api.post<ReportPreviewResponse>('/rapports/generer', {
      ...payload,
      format: 'json',
    });
    return response.data;
  },

  async exporter(payload: ReportConfigPayload, format: 'pdf' | 'xlsx' | 'csv') {
    const response = await api.post('/rapports/generer', {
      ...payload,
      format,
      page: 1,
      per_page: 20,
    }, {
      responseType: 'blob',
    });

    return response.data as Blob;
  },
};
