import { api } from '../lib/api';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  currency: string;
  last_transaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

class WalletService {
  async getWallet(): Promise<Wallet> {
    const response = await api.get<Wallet>('/seller/wallet');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar carteira');
  }

  async getHistory(filters?: {
    type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<WalletTransaction[]> {
    const params = new URLSearchParams();

    if (filters?.type) params.append('type', filters.type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/seller/wallet/history?${queryString}`
      : '/seller/wallet/history';

    const response = await api.get<WalletTransaction[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar histórico');
  }

  async requestWithdrawal(amount: number, bank_account: any): Promise<void> {
    const response = await api.post('/seller/wallet/withdrawal', {
      amount,
      bank_account,
    });

    if (!response.success) {
      throw new Error(response.message || 'Erro ao solicitar saque');
    }
  }
}

export const walletService = new WalletService();
