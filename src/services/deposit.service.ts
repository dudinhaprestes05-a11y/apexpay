import { api } from '../lib/api';

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  provider: string;
  provider_transaction_id: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_copy_paste: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDepositRequest {
  amount: number;
  description?: string;
}

export interface CreateDepositResponse {
  success: boolean;
  deposit?: Deposit;
  error?: string;
}

export class DepositService {
  static async createDeposit(
    userId: string,
    request: CreateDepositRequest
  ): Promise<CreateDepositResponse> {
    try {
      if (request.amount <= 0) {
        return { success: false, error: 'O valor deve ser maior que zero' };
      }

      if (request.amount < 1) {
        return { success: false, error: 'O valor mínimo para depósito é R$ 1,00' };
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-deposit`;

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: 'Você precisa estar autenticado',
        };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: request.amount,
          description: request.description || `Depósito de R$ ${request.amount.toFixed(2)}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Erro ao criar cobrança PIX',
        };
      }

      const result = await response.json();

      if (!result.success || !result.deposit) {
        return {
          success: false,
          error: result.error || 'Erro ao criar depósito',
        };
      }

      return { success: true, deposit: result.deposit };
    } catch (error) {
      console.error('Error creating deposit:', error);
      return {
        success: false,
        error: 'Erro ao criar depósito. Tente novamente.',
      };
    }
  }

  static async getDeposits(userId: string): Promise<Deposit[]> {
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching deposits:', error);
      return [];
    }
  }

  static async getDeposit(depositId: string): Promise<Deposit | null> {
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching deposit:', error);
      return null;
    }
  }

  static async cancelDeposit(depositId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({ status: 'cancelled' })
        .eq('id', depositId)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error cancelling deposit:', error);
      return false;
    }
  }

  static async markDepositAsPaid(
    depositId: string,
    providerTransactionId: string
  ): Promise<boolean> {
    try {
      const { data: deposit } = await supabase
        .from('deposits')
        .select('user_id, amount, status')
        .eq('id', depositId)
        .maybeSingle();

      if (!deposit || deposit.status === 'paid') {
        return false;
      }

      const { error: updateError } = await supabase
        .from('deposits')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', depositId);

      if (updateError) throw updateError;

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', deposit.user_id)
        .maybeSingle();

      if (wallet) {
        const newBalance = parseFloat(wallet.balance.toString()) + deposit.amount;

        await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', deposit.user_id);
      }

      await supabase.from('notifications').insert({
        user_id: deposit.user_id,
        type: 'deposit_confirmed',
        title: 'Depósito Confirmado',
        message: `Seu depósito de R$ ${deposit.amount.toFixed(2)} foi confirmado e creditado na sua carteira.`,
        data: { deposit_id: depositId },
      });

      return true;
    } catch (error) {
      console.error('Error marking deposit as paid:', error);
      return false;
    }
  }

  static async checkExpiredDeposits(): Promise<void> {
    try {
      const now = new Date().toISOString();

      await supabase
        .from('deposits')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', now);
    } catch (error) {
      console.error('Error checking expired deposits:', error);
    }
  }
}
