export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'seller';
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
}

export interface Seller {
  id: number;
  user_id: number;
  api_key: string;
  api_secret: string;
  webhook_url?: string;
  fee_percentage: number;
  balance_available: number;
  balance_frozen: number;
  pix_key?: string;
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

export interface Transaction {
  id: number;
  seller_id: number;
  external_id?: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
  pix_code?: string;
  payer_name?: string;
  payer_document?: string;
  description?: string;
  paid_at?: string;
  expires_at?: string;
  created_at: string;
  seller_name?: string;
  seller_email?: string;
}

export interface Withdrawal {
  id: number;
  seller_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  pix_key: string;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  notes?: string;
  approved_at?: string;
  completed_at?: string;
  created_at: string;
  seller_name?: string;
  seller_email?: string;
}
