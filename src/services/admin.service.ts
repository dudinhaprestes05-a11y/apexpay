import { api } from '../lib/api';
import { User, Transaction } from '../types';

export interface DashboardStats {
  total_sellers: number;
  active_sellers: number;
  total_transactions: number;
  total_volume: number;
  pending_kyc: number;
}

export interface Acquirer {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  priority: number;
  credentials: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GlobalConfig {
  platform_fee_percentage: number;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  withdrawal_cooldown_hours: number;
  kyc_required_for_withdrawal: boolean;
}

export interface WebhookLog {
  id: string;
  acquirer_name: string;
  event_type: string;
  status: string;
  payload: Record<string, any>;
  response: Record<string, any>;
  created_at: string;
}

class AdminService {
  async getDashboard(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/admin/dashboard');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar dashboard');
  }

  async listSellers(filters?: {
    status?: string;
    kyc_status?: string;
    search?: string;
  }): Promise<User[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.kyc_status) params.append('kyc_status', filters.kyc_status);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/sellers?${queryString}` : '/admin/sellers';

    const response = await api.get<User[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar sellers');
  }

  async getSeller(id: string): Promise<User> {
    const response = await api.get<User>(`/admin/sellers/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar seller');
  }

  async updateSeller(id: string, data: Partial<User>): Promise<User> {
    const response = await api.put<User>(`/admin/sellers/${id}`, data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar seller');
  }

  async listAcquirers(): Promise<Acquirer[]> {
    const response = await api.get<Acquirer[]>('/admin/acquirers');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar adquirentes');
  }

  async createAcquirer(data: Partial<Acquirer>): Promise<Acquirer> {
    const response = await api.post<Acquirer>('/admin/acquirers', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao criar adquirente');
  }

  async updateAcquirer(id: string, data: Partial<Acquirer>): Promise<Acquirer> {
    const response = await api.put<Acquirer>(`/admin/acquirers/${id}`, data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar adquirente');
  }

  async deleteAcquirer(id: string): Promise<void> {
    const response = await api.delete(`/admin/acquirers/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Erro ao deletar adquirente');
    }
  }

  async getKYCApprovals(filters?: { status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/kyc-approvals?${queryString}`
      : '/admin/kyc-approvals';

    const response = await api.get<any[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar aprovações KYC');
  }

  async approveKYC(
    documentId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    const response = await api.put(`/admin/kyc-approvals/${documentId}`, {
      status,
      notes,
    });

    if (!response.success) {
      throw new Error(response.message || 'Erro ao processar KYC');
    }
  }

  async getConfig(): Promise<GlobalConfig> {
    const response = await api.get<GlobalConfig>('/admin/config');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar configurações');
  }

  async updateConfig(data: Partial<GlobalConfig>): Promise<GlobalConfig> {
    const response = await api.put<GlobalConfig>('/admin/config', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar configurações');
  }

  async getWebhookLogs(filters?: {
    acquirer?: string;
    event_type?: string;
    status?: string;
  }): Promise<WebhookLog[]> {
    const params = new URLSearchParams();

    if (filters?.acquirer) params.append('acquirer', filters.acquirer);
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/webhooks/logs?${queryString}`
      : '/admin/webhooks/logs';

    const response = await api.get<WebhookLog[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar logs de webhook');
  }

  async listTransactions(filters?: {
    status?: string;
    seller_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Transaction[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.seller_id) params.append('seller_id', filters.seller_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/transactions?${queryString}` : '/admin/transactions';

    const response = await api.get<Transaction[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar transações');
  }
}

export const adminService = new AdminService();
