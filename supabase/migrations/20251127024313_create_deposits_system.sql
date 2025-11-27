/*
  # Create Deposits System for Sellers

  1. New Tables
    - `deposits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `amount` (decimal)
      - `status` (text: pending, paid, expired, cancelled)
      - `provider` (text: podpay)
      - `provider_transaction_id` (text)
      - `pix_qr_code` (text)
      - `pix_qr_code_base64` (text)
      - `pix_copy_paste` (text)
      - `expires_at` (timestamptz)
      - `paid_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `deposits` table
    - Users can view their own deposits
    - Users can create their own deposits
    - Admins can view all deposits

  3. Indexes
    - Index on user_id for fast lookups
    - Index on provider_transaction_id for webhook processing
    - Index on status for filtering
*/

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  provider text NOT NULL DEFAULT 'podpay',
  provider_transaction_id text,
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_copy_paste text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits(user_id);
CREATE INDEX IF NOT EXISTS deposits_provider_transaction_id_idx ON deposits(provider_transaction_id);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON deposits(status);
CREATE INDEX IF NOT EXISTS deposits_created_at_idx ON deposits(created_at DESC);

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "users_view_own_deposits"
ON deposits FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Users can create their own deposits
CREATE POLICY "users_create_own_deposits"
ON deposits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deposits (for cancellation)
CREATE POLICY "users_update_own_deposits"
ON deposits FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id AND status IN ('pending', 'cancelled')
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposits_updated_at ON deposits;
CREATE TRIGGER deposits_updated_at
  BEFORE UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_deposits_updated_at();

-- Add deposit statistics to user stats view
CREATE OR REPLACE VIEW user_deposit_stats AS
SELECT
  user_id,
  COUNT(*) as total_deposits,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_deposited,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_deposits,
  MAX(created_at) as last_deposit_at
FROM deposits
GROUP BY user_id;

GRANT SELECT ON user_deposit_stats TO authenticated;
