export type UserRole = 'admin' | 'seller';
export type KYCStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'cash_in' | 'cash_out';
export type TransactionStatus = 'pending' | 'paid' | 'refused' | 'cancelled' | 'processing' | 'waiting_payment';
export type PaymentMethod = 'pix';
export type Environment = 'sandbox' | 'production';
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
export type FeeType = 'percentage' | 'fixed' | 'mixed';
export type DocumentType = 'cpf' | 'cnpj';
export type KYCDocumentType = 'rg_frente' | 'rg_verso' | 'selfie_com_rg' | 'contrato_social' | 'comprovante_endereco';
export type KYCDocumentStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'kyc_approved' | 'kyc_rejected' | 'transaction_paid' | 'fee_changed' | 'acquirer_changed' | 'balance_credited';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  kyc_status: KYCStatus;
  document_cpf_cnpj?: string;
  address?: Address;
  document_url?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  frozen_balance: number;
  total_fees_paid: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  provider: string;
  provider_transaction_id?: string;
  type: TransactionType;
  amount: number;
  fee_amount: number;
  net_amount: number;
  fee_percentage?: number;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  acquirer_id?: string;
  pix_qrcode?: string;
  pix_copy_paste?: string;
  pix_expiration?: string;
  end_to_end_id?: string;
  metadata?: Record<string, any>;
  customer_data?: CustomerData;
  created_at: string;
  updated_at: string;
}

export interface CustomerData {
  name?: string;
  email?: string;
  document?: {
    number: string;
    type: 'cpf' | 'cnpj';
  };
}

export interface ApiKey {
  id: string;
  user_id: string;
  client_id: string;
  client_secret_hash: string;
  name: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  provider: string;
  event_type: string;
  transaction_id?: string;
  payload_json: Record<string, any>;
  http_status: number;
  created_at: string;
}

export interface PodPayConfig {
  id: string;
  environment: Environment;
  public_key: string;
  secret_key: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodPayCashInRequest {
  amount: number;
  paymentMethod: 'pix';
  items: Array<{
    title: string;
    unitPrice: number;
    quantity: number;
    tangible: boolean;
  }>;
  customer: {
    name: string;
    email: string;
    document: {
      number: string;
      type: 'cpf' | 'cnpj';
    };
  };
  postbackUrl: string;
  metadata?: Record<string, any>;
}

export interface PodPayCashInResponse {
  id: number;
  amount: number;
  status: string;
  paymentMethod: string;
  pix?: {
    qrcode: string;
    expirationDate: string;
  };
}

export interface PodPayCashOutRequest {
  amount: number;
  paymentMethod: 'withdraw';
  pixKey: string;
  pixKeyType: PixKeyType;
  customer: {
    name: string;
    email: string;
    document: {
      number: string;
      type: 'cpf' | 'cnpj';
    };
  };
}

export interface PodPayWebhookPayload {
  type: string;
  url: string;
  objectId: string;
  data: {
    id: number;
    amount: number;
    status: string;
    paymentMethod: string;
    paidAt?: string;
    metadata?: string;
    pix?: {
      qrcode: string;
      end2EndId: string;
    };
  };
}

export interface DashboardStats {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  activeUsers: number;
  pendingKYC: number;
}

export interface CreateTransactionRequest {
  amount: number;
  customer: {
    name: string;
    email: string;
    document: string;
    documentType: 'cpf' | 'cnpj';
  };
  metadata?: Record<string, any>;
}

export interface SellerPaymentConfig {
  id: string;
  user_id: string;
  environment: Environment;
  webhook_url?: string;
  is_active: boolean;
  use_global_config: boolean;
  created_at: string;
  updated_at: string;
}

export interface SellerFees {
  id: string;
  user_id: string;
  fee_type: FeeType;
  cash_in_fee_percentage: number;
  cash_out_fee_percentage: number;
  cash_in_fee_fixed: number;
  cash_out_fee_fixed: number;
  min_fee: number;
  max_fee?: number;
  created_at: string;
  updated_at: string;
}

export interface FeeChangeHistory {
  id: string;
  user_id: string;
  changed_by: string;
  old_fees: Record<string, any>;
  new_fees: Record<string, any>;
  reason?: string;
  created_at: string;
}

export interface FeeCalculation {
  amount: number;
  fee_amount: number;
  net_amount: number;
  fee_percentage: number;
}

export interface SellerWithConfig extends User {
  payment_config?: SellerPaymentConfig;
  fees?: SellerFees;
  wallet?: Wallet;
  acquirer_assignment?: SellerAcquirerAssignment;
  user_details?: UserDetails;
}

export interface PaymentAcquirer {
  id: string;
  name: string;
  provider_type: string;
  public_key: string;
  secret_key: string;
  environment: Environment;
  is_active: boolean;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SellerAcquirerAssignment {
  id: string;
  user_id: string;
  acquirer_id: string;
  assigned_by?: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
  acquirer?: PaymentAcquirer;
}

export interface AcquirerAssignmentHistory {
  id: string;
  user_id: string;
  old_acquirer_id?: string;
  new_acquirer_id?: string;
  changed_by?: string;
  reason?: string;
  changed_at: string;
}

export interface DefaultFeesConfig {
  id: string;
  fee_type: FeeType;
  cash_in_fee_percentage: number;
  cash_out_fee_percentage: number;
  cash_in_fee_fixed: number;
  cash_out_fee_fixed: number;
  min_fee: number;
  max_fee?: number;
  updated_at: string;
  updated_by?: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: KYCDocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: KYCDocumentStatus;
  rejection_reason?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface UserDetails {
  id: string;
  user_id: string;
  document_type: DocumentType;
  birth_date?: string;
  phone?: string;
  phone_secondary?: string;
  mother_name?: string;
  profession?: string;
  company_legal_name?: string;
  company_trade_name?: string;
  company_opening_date?: string;
  company_main_activity?: string;
  legal_representative_name?: string;
  legal_representative_cpf?: string;
  legal_representative_email?: string;
  legal_representative_phone?: string;
  legal_representative_position?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
