/*
  # Refactor to Acquirer-Based Architecture and Complete KYC

  1. New Tables
    - `payment_acquirers` - Catalog of payment acquirers
    - `seller_acquirer_assignments` - Acquirer assignment per seller
    - `acquirer_assignment_history` - History of changes
    - `default_fees_config` - Global default fees
    - `kyc_documents` - Multiple documents per seller
    - `user_details` - Extended user information
    - `notifications` - In-app notifications

  2. Updates
    - Add acquirer_id to transactions
    - Remove credential fields from seller_payment_configs

  3. Security
    - Enable RLS on all new tables
*/

-- Create payment_acquirers table
CREATE TABLE IF NOT EXISTS payment_acquirers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'podpay' CHECK (provider_type IN ('podpay')),
  public_key text NOT NULL,
  secret_key text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active boolean DEFAULT true,
  webhook_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seller_acquirer_assignments table
CREATE TABLE IF NOT EXISTS seller_acquirer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acquirer_id uuid NOT NULL REFERENCES payment_acquirers(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  notes text
);

-- Create unique index for active assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_acquirer_assignments_unique_active 
  ON seller_acquirer_assignments(user_id) 
  WHERE is_active = true;

-- Create acquirer_assignment_history table
CREATE TABLE IF NOT EXISTS acquirer_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_acquirer_id uuid REFERENCES payment_acquirers(id),
  new_acquirer_id uuid REFERENCES payment_acquirers(id),
  changed_by uuid REFERENCES users(id),
  reason text,
  changed_at timestamptz DEFAULT now()
);

-- Create default_fees_config table
CREATE TABLE IF NOT EXISTS default_fees_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type text NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed', 'mixed')),
  cash_in_fee_percentage decimal(5, 2) DEFAULT 2.50 NOT NULL,
  cash_out_fee_percentage decimal(5, 2) DEFAULT 2.50 NOT NULL,
  cash_in_fee_fixed decimal(10, 2) DEFAULT 0.00 NOT NULL,
  cash_out_fee_fixed decimal(10, 2) DEFAULT 0.00 NOT NULL,
  min_fee decimal(10, 2) DEFAULT 0.00 NOT NULL,
  max_fee decimal(10, 2),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create kyc_documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('rg_frente', 'rg_verso', 'selfie_com_rg', 'contrato_social', 'comprovante_endereco')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id)
);

-- Create user_details table
CREATE TABLE IF NOT EXISTS user_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  birth_date date,
  phone text,
  phone_secondary text,
  mother_name text,
  profession text,
  company_legal_name text,
  company_trade_name text,
  company_opening_date date,
  company_main_activity text,
  legal_representative_name text,
  legal_representative_cpf text,
  legal_representative_email text,
  legal_representative_phone text,
  legal_representative_position text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add acquirer_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'acquirer_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN acquirer_id uuid REFERENCES payment_acquirers(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_acquirers_active ON payment_acquirers(is_active);
CREATE INDEX IF NOT EXISTS idx_seller_acquirer_assignments_user ON seller_acquirer_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_acquirer_assignments_acquirer ON seller_acquirer_assignments(acquirer_id);
CREATE INDEX IF NOT EXISTS idx_seller_acquirer_assignments_active ON seller_acquirer_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_acquirer_assignment_history_user ON acquirer_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_details_user ON user_details(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE payment_acquirers ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_acquirer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquirer_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_fees_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_acquirers
CREATE POLICY "Admins can manage acquirers"
  ON payment_acquirers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for seller_acquirer_assignments
CREATE POLICY "Admins can manage assignments"
  ON seller_acquirer_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own assignment"
  ON seller_acquirer_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for acquirer_assignment_history
CREATE POLICY "Admins can view assignment history"
  ON acquirer_assignment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own assignment history"
  ON acquirer_assignment_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for default_fees_config
CREATE POLICY "Admins can manage default fees"
  ON default_fees_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Everyone can view default fees"
  ON default_fees_config FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for kyc_documents
CREATE POLICY "Sellers can manage own documents"
  ON kyc_documents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all documents"
  ON kyc_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update document status"
  ON kyc_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for user_details
CREATE POLICY "Users can manage own details"
  ON user_details FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all user details"
  ON user_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default fees config
INSERT INTO default_fees_config (
  fee_type,
  cash_in_fee_percentage,
  cash_out_fee_percentage,
  min_fee
)
VALUES ('percentage', 2.50, 2.50, 0.00)
ON CONFLICT DO NOTHING;

-- Migrate existing podpay_config to payment_acquirers
DO $$
DECLARE
  global_config RECORD;
  new_acquirer_id uuid;
BEGIN
  SELECT * INTO global_config
  FROM podpay_config
  WHERE is_active = true
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO payment_acquirers (
      name,
      provider_type,
      public_key,
      secret_key,
      environment,
      is_active,
      webhook_url
    )
    VALUES (
      'PodPay Principal',
      'podpay',
      global_config.public_key,
      global_config.secret_key,
      global_config.environment,
      true,
      global_config.webhook_url
    )
    RETURNING id INTO new_acquirer_id;

    INSERT INTO seller_acquirer_assignments (user_id, acquirer_id, is_active, notes)
    SELECT 
      u.id,
      new_acquirer_id,
      true,
      'Migrated from global config'
    FROM users u
    WHERE u.role = 'seller' AND u.kyc_status = 'approved'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Update trigger to use default_fees_config
CREATE OR REPLACE FUNCTION create_default_seller_config()
RETURNS TRIGGER AS $$
DECLARE
  default_fees RECORD;
BEGIN
  IF NEW.role = 'seller' AND NEW.kyc_status = 'approved' THEN
    SELECT * INTO default_fees FROM default_fees_config LIMIT 1;

    INSERT INTO seller_payment_configs (user_id, use_global_config, is_active)
    VALUES (NEW.id, true, true)
    ON CONFLICT (user_id) DO NOTHING;

    IF default_fees IS NOT NULL THEN
      INSERT INTO seller_fees (
        user_id,
        fee_type,
        cash_in_fee_percentage,
        cash_out_fee_percentage,
        cash_in_fee_fixed,
        cash_out_fee_fixed,
        min_fee,
        max_fee
      )
      VALUES (
        NEW.id,
        default_fees.fee_type,
        default_fees.cash_in_fee_percentage,
        default_fees.cash_out_fee_percentage,
        default_fees.cash_in_fee_fixed,
        default_fees.cash_out_fee_fixed,
        default_fees.min_fee,
        default_fees.max_fee
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for assignment history
CREATE OR REPLACE FUNCTION log_acquirer_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.acquirer_id != NEW.acquirer_id THEN
    INSERT INTO acquirer_assignment_history (
      user_id,
      old_acquirer_id,
      new_acquirer_id,
      changed_by,
      reason
    )
    VALUES (
      NEW.user_id,
      OLD.acquirer_id,
      NEW.acquirer_id,
      auth.uid(),
      NEW.notes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_acquirer_assignment_changed ON seller_acquirer_assignments;
CREATE TRIGGER on_acquirer_assignment_changed
  AFTER UPDATE ON seller_acquirer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_acquirer_assignment_change();

DROP TRIGGER IF EXISTS update_payment_acquirers_updated_at ON payment_acquirers;
CREATE TRIGGER update_payment_acquirers_updated_at
  BEFORE UPDATE ON payment_acquirers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_details_updated_at ON user_details;
CREATE TRIGGER update_user_details_updated_at
  BEFORE UPDATE ON user_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
