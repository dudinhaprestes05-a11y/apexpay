import { api } from '../lib/api';
import { Transaction } from '../types';

export interface TransactionFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
}

class TransactionService {
  async listTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.min_amount) params.append('min_amount', filters.min_amount.toString());
    if (filters?.max_amount) params.append('max_amount', filters.max_amount.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/seller/transactions?${queryString}` : '/seller/transactions';

    const response = await api.get<Transaction[]>(endpoint);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar transações');
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/seller/transactions/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar transação');
  }
}

export const transactionService = new TransactionService();
