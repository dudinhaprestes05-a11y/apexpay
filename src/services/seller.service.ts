import { api } from '../lib/api';
import { User } from '../types';

export interface SellerDashboardStats {
  total_transactions: number;
  total_volume: number;
  available_balance: number;
  pending_balance: number;
  recent_transactions: any[];
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  type: string;
  file_url: string;
  status: string;
  notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

class SellerService {
  async getDashboard(): Promise<SellerDashboardStats> {
    const response = await api.get<SellerDashboardStats>('/seller/dashboard');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar dashboard');
  }

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/seller/profile');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar perfil');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<User>('/seller/profile', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar perfil');
  }

  async getApiKeys(): Promise<ApiKey[]> {
    const response = await api.get<ApiKey[]>('/seller/api-keys');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar chaves API');
  }

  async createApiKey(name: string): Promise<ApiKey> {
    const response = await api.post<ApiKey>('/seller/api-keys', { name });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao criar chave API');
  }

  async deleteApiKey(id: string): Promise<void> {
    const response = await api.delete(`/seller/api-keys/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Erro ao deletar chave API');
    }
  }

  async toggleApiKey(id: string, isActive: boolean): Promise<ApiKey> {
    const response = await api.put<ApiKey>(`/seller/api-keys/${id}`, {
      is_active: isActive,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar chave API');
  }

  async getDocuments(): Promise<Document[]> {
    const response = await api.get<Document[]>('/seller/documents');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar documentos');
  }

  async uploadDocument(type: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);

    const response = await api.upload<Document>('/seller/documents/upload', formData);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao fazer upload do documento');
  }

  async deleteDocument(id: string): Promise<void> {
    const response = await api.delete(`/seller/documents/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Erro ao deletar documento');
    }
  }
}

export const sellerService = new SellerService();
