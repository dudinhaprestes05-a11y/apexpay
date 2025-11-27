/*
  # MySQL Payment Gateway Schema

  Complete database schema converted from PostgreSQL/Supabase to MySQL 8.0+

  Key Changes from PostgreSQL:
  - uuid -> CHAR(36) with UUID() function
  - jsonb -> JSON
  - timestamptz -> TIMESTAMP (UTC)
  - text -> VARCHAR or TEXT based on use
  - Triggers for updated_at fields
  - Auth/RLS logic moved to PHP application layer
*/

-- Set timezone to UTC
SET time_zone = '+00:00';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'seller') NOT NULL DEFAULT 'seller',
  kyc_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  document_cpf_cnpj VARCHAR(20),
  address JSON DEFAULT NULL,
  document_url TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_kyc_status (kyc_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) UNIQUE NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  frozen_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  total_fees_paid DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  pending_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallets_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payment_acquirers table
CREATE TABLE IF NOT EXISTS payment_acquirers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL DEFAULT 'podpay',
  public_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  environment ENUM('sandbox', 'production') NOT NULL DEFAULT 'sandbox',
  is_active BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_acquirers_active (is_active),
  INDEX idx_payment_acquirers_provider (provider_type),
  CHECK (provider_type IN ('podpay'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  acquirer_id CHAR(36),
  provider VARCHAR(50) NOT NULL DEFAULT 'podpay',
  provider_transaction_id VARCHAR(255),
  type ENUM('cash_in', 'cash_out') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fee_amount DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  net_amount DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
  status ENUM('pending', 'paid', 'refused', 'cancelled', 'processing', 'waiting_payment') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'pix',
  pix_qrcode TEXT,
  pix_copy_paste TEXT,
  pix_expiration TIMESTAMP NULL,
  end_to_end_id VARCHAR(255),
  metadata JSON DEFAULT NULL,
  customer_data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (acquirer_id) REFERENCES payment_acquirers(id) ON DELETE SET NULL,
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_acquirer_id (acquirer_id),
  INDEX idx_transactions_status (status),
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_created_at (created_at DESC),
  INDEX idx_transactions_provider_id (provider_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  acquirer_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'paid', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NOT NULL DEFAULT 'podpay',
  provider_transaction_id VARCHAR(255),
  pix_qr_code TEXT,
  pix_qr_code_base64 LONGTEXT,
  pix_copy_paste TEXT,
  expires_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (acquirer_id) REFERENCES payment_acquirers(id) ON DELETE SET NULL,
  INDEX idx_deposits_user_id (user_id),
  INDEX idx_deposits_status (status),
  INDEX idx_deposits_created_at (created_at DESC),
  INDEX idx_deposits_provider_id (provider_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  client_id VARCHAR(255) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_api_keys_user_id (user_id),
  INDEX idx_api_keys_client_id (client_id),
  INDEX idx_api_keys_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(255),
  payload_json JSON NOT NULL,
  http_status INT DEFAULT 200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_webhook_logs_provider (provider),
  INDEX idx_webhook_logs_transaction_id (transaction_id),
  INDEX idx_webhook_logs_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create seller_acquirer_assignments table
CREATE TABLE IF NOT EXISTS seller_acquirer_assignments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  acquirer_id CHAR(36) NOT NULL,
  assigned_by CHAR(36),
  priority INT DEFAULT 1 NOT NULL,
  weight INT DEFAULT 100 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  last_failure_at TIMESTAMP NULL,
  failure_count INT DEFAULT 0,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (acquirer_id) REFERENCES payment_acquirers(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY idx_seller_acquirer_unique_active (user_id, acquirer_id, is_active),
  INDEX idx_seller_acquirer_user (user_id),
  INDEX idx_seller_acquirer_acquirer (acquirer_id),
  INDEX idx_seller_acquirer_active (is_active),
  INDEX idx_seller_acquirer_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create acquirer_transaction_limits table
CREATE TABLE IF NOT EXISTS acquirer_transaction_limits (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  acquirer_id CHAR(36) NOT NULL,
  transaction_type ENUM('cash_in', 'cash_out') NOT NULL,
  min_amount DECIMAL(15, 2) NOT NULL DEFAULT 1.00,
  max_amount DECIMAL(15, 2),
  daily_limit DECIMAL(15, 2),
  monthly_limit DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (acquirer_id) REFERENCES payment_acquirers(id) ON DELETE CASCADE,
  INDEX idx_acquirer_limits_acquirer (acquirer_id),
  INDEX idx_acquirer_limits_type (transaction_type),
  INDEX idx_acquirer_limits_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create seller_fees table
CREATE TABLE IF NOT EXISTS seller_fees (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) UNIQUE NOT NULL,
  fee_type ENUM('percentage', 'fixed', 'mixed') NOT NULL DEFAULT 'percentage',
  cash_in_fee_percentage DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
  cash_out_fee_percentage DECIMAL(5, 2) DEFAULT 0.00 NOT NULL,
  cash_in_fee_fixed DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  cash_out_fee_fixed DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  min_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  max_fee DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_seller_fees_user_id (user_id),
  CHECK (cash_in_fee_percentage >= 0 AND cash_in_fee_percentage <= 100),
  CHECK (cash_out_fee_percentage >= 0 AND cash_out_fee_percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create fee_change_history table
CREATE TABLE IF NOT EXISTS fee_change_history (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  changed_by CHAR(36) NOT NULL,
  old_fees JSON DEFAULT NULL,
  new_fees JSON DEFAULT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_fee_change_user (user_id),
  INDEX idx_fee_change_changed_by (changed_by),
  INDEX idx_fee_change_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default_fees_config table
CREATE TABLE IF NOT EXISTS default_fees_config (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  fee_type ENUM('percentage', 'fixed', 'mixed') NOT NULL DEFAULT 'percentage',
  cash_in_fee_percentage DECIMAL(5, 2) DEFAULT 2.50 NOT NULL,
  cash_out_fee_percentage DECIMAL(5, 2) DEFAULT 2.50 NOT NULL,
  cash_in_fee_fixed DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  cash_out_fee_fixed DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  min_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  max_fee DECIMAL(10, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create kyc_documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  document_type ENUM('rg_frente', 'rg_verso', 'selfie_com_rg', 'contrato_social', 'comprovante_endereco') NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by CHAR(36),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_kyc_documents_user (user_id),
  INDEX idx_kyc_documents_status (status),
  INDEX idx_kyc_documents_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_details table
CREATE TABLE IF NOT EXISTS user_details (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) UNIQUE NOT NULL,
  document_type ENUM('cpf', 'cnpj') NOT NULL,
  birth_date DATE,
  phone VARCHAR(20),
  phone_secondary VARCHAR(20),
  mother_name VARCHAR(255),
  profession VARCHAR(255),
  company_legal_name VARCHAR(255),
  company_trade_name VARCHAR(255),
  company_opening_date DATE,
  company_main_activity VARCHAR(255),
  legal_representative_name VARCHAR(255),
  legal_representative_cpf VARCHAR(14),
  legal_representative_email VARCHAR(255),
  legal_representative_phone VARCHAR(20),
  legal_representative_position VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_details_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create global_config table
CREATE TABLE IF NOT EXISTS global_config (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSON NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by CHAR(36),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_global_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create acquirer_assignment_history table
CREATE TABLE IF NOT EXISTS acquirer_assignment_history (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  old_acquirer_id CHAR(36),
  new_acquirer_id CHAR(36),
  changed_by CHAR(36),
  reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (old_acquirer_id) REFERENCES payment_acquirers(id) ON DELETE SET NULL,
  FOREIGN KEY (new_acquirer_id) REFERENCES payment_acquirers(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_assignment_history_user (user_id),
  INDEX idx_assignment_history_changed_at (changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trigger to automatically create wallet when user is created
DELIMITER //
CREATE TRIGGER create_wallet_for_user
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO wallets (id, user_id, balance, frozen_balance, total_fees_paid, pending_balance)
  VALUES (UUID(), NEW.id, 0.00, 0.00, 0.00, 0.00);
END//
DELIMITER ;

-- Insert default fees configuration
INSERT INTO default_fees_config (id, fee_type, cash_in_fee_percentage, cash_out_fee_percentage, cash_in_fee_fixed, cash_out_fee_fixed, min_fee, max_fee)
VALUES (UUID(), 'percentage', 2.50, 2.50, 0.00, 0.00, 0.00, NULL)
ON DUPLICATE KEY UPDATE id=id;
