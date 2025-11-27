/*
  # Add Seller-Specific Payment Configs and Fees

  1. New Tables
    - `seller_payment_configs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users) - unique per user
      - `podpay_public_key` (text) - seller's own PodPay public key (optional)
      - `podpay_secret_key` (text) - seller's own PodPay secret key (optional)
      - `environment` (text) - sandbox or production
      - `webhook_url` (text) - unique webhook URL for this seller
      - `is_active` (boolean) - whether this config is active
      - `use_global_config` (boolean) - if true, uses global podpay_config instead
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `seller_fees`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users) - unique per user
      - `fee_type` (text) - percentage, fixed, or mixed
      - `cash_in_fee_percentage` (decimal) - percentage fee for cash-in (e.g., 2.5 = 2.5%)
      - `cash_out_fee_percentage` (decimal) - percentage fee for cash-out
      - `cash_in_fee_fixed` (decimal) - fixed fee for cash-in in BRL
      - `cash_out_fee_fixed` (decimal) - fixed fee for cash-out in BRL
      - `min_fee` (decimal) - minimum fee per transaction
      - `max_fee` (decimal) - maximum fee per transaction
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `fee_change_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `changed_by` (uuid, foreign key to users) - admin who made the change
      - `old_fees` (jsonb) - previous fee configuration
      - `new_fees` (jsonb) - new fee configuration
      - `reason` (text) - reason for change
      - `created_at` (timestamptz)

  2. Updates to Existing Tables
    - `transactions` - add fee tracking fields
    - `wallets` - add fee statistics fields

  3. Security
    - Enable RLS on all new tables
    - Only admins can modify configs and fees
    - Sellers can view their own configs and fees (read-only)
*/

-- Create seller_payment_configs table
CREATE TABLE IF NOT EXISTS seller_payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podpay_public_key text,
  podpay_secret_key text,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  webhook_url text,
  is_active boolean DEFAULT true,
  use_global_config boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seller_fees table
CREATE TABLE IF NOT EXISTS seller_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fee_type text NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed', 'mixed')),
  cash_in_fee_percentage decimal(5, 2) DEFAULT 0.00 NOT NULL CHECK (cash_in_fee_percentage >= 0 AND cash_in_fee_percentage <= 100),
  cash_out_fee_percentage decimal(5, 2) DEFAULT 0.00 NOT NULL CHECK (cash_out_fee_percentage >= 0 AND cash_out_fee_percentage <= 100),
  cash_in_fee_fixed decimal(10, 2) DEFAULT 0.00 NOT NULL,
  cash_out_fee_fixed decimal(10, 2) DEFAULT 0.00 NOT NULL,
  min_fee decimal(10, 2) DEFAULT 0.00 NOT NULL,
  max_fee decimal(10, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fee_change_history table
CREATE TABLE IF NOT EXISTS fee_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES users(id),
  old_fees jsonb DEFAULT '{}'::jsonb,
  new_fees jsonb DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Add fee tracking fields to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'fee_amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN fee_amount decimal(15, 2) DEFAULT 0.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN net_amount decimal(15, 2) DEFAULT 0.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'fee_percentage'
  ) THEN
    ALTER TABLE transactions ADD COLUMN fee_percentage decimal(5, 2) DEFAULT 0.00;
  END IF;
END $$;

-- Add fee statistics fields to wallets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallets' AND column_name = 'total_fees_paid'
  ) THEN
    ALTER TABLE wallets ADD COLUMN total_fees_paid decimal(15, 2) DEFAULT 0.00 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallets' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE wallets ADD COLUMN pending_balance decimal(15, 2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_payment_configs_user_id ON seller_payment_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payment_configs_active ON seller_payment_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_seller_fees_user_id ON seller_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_change_history_user_id ON fee_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_change_history_changed_by ON fee_change_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_fee_change_history_created_at ON fee_change_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE seller_payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_payment_configs
CREATE POLICY "Admins can view all seller configs"
  ON seller_payment_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own config"
  ON seller_payment_configs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage seller configs"
  ON seller_payment_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for seller_fees
CREATE POLICY "Admins can view all seller fees"
  ON seller_fees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own fees"
  ON seller_fees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage seller fees"
  ON seller_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for fee_change_history
CREATE POLICY "Admins can view all fee change history"
  ON fee_change_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own fee change history"
  ON fee_change_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can insert fee change history"
  ON fee_change_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Create function to log fee changes
CREATE OR REPLACE FUNCTION log_fee_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fee_change_history (user_id, changed_by, old_fees, new_fees)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for fee changes
DROP TRIGGER IF EXISTS on_seller_fees_changed ON seller_fees;
CREATE TRIGGER on_seller_fees_changed
  AFTER UPDATE ON seller_fees
  FOR EACH ROW
  EXECUTE FUNCTION log_fee_change();

-- Create function to auto-create default configs when seller is approved
CREATE OR REPLACE FUNCTION create_default_seller_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if user is a seller and KYC is approved
  IF NEW.role = 'seller' AND NEW.kyc_status = 'approved' THEN
    -- Create default payment config if not exists
    INSERT INTO seller_payment_configs (user_id, use_global_config, is_active)
    VALUES (NEW.id, true, true)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create default fee config if not exists
    INSERT INTO seller_fees (
      user_id,
      fee_type,
      cash_in_fee_percentage,
      cash_out_fee_percentage,
      min_fee
    )
    VALUES (NEW.id, 'percentage', 2.50, 2.50, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create configs on KYC approval
DROP TRIGGER IF EXISTS on_seller_approved ON users;
CREATE TRIGGER on_seller_approved
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.role = 'seller' AND NEW.kyc_status = 'approved')
  EXECUTE FUNCTION create_default_seller_config();

-- Update triggers for updated_at
DROP TRIGGER IF EXISTS update_seller_payment_configs_updated_at ON seller_payment_configs;
CREATE TRIGGER update_seller_payment_configs_updated_at
  BEFORE UPDATE ON seller_payment_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_fees_updated_at ON seller_fees;
CREATE TRIGGER update_seller_fees_updated_at
  BEFORE UPDATE ON seller_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
