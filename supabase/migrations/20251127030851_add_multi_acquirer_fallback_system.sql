/*
  # Sistema de Fallback de Adquirentes com Prioridade

  1. Mudanças nas Tabelas
    - `seller_acquirer_assignments` - Adicionar campos de prioridade e limites
    - Remover constraint de única adquirente ativa por seller
    - Adicionar limites min/max por tipo de transação
    
  2. Novas Tabelas
    - `acquirer_transaction_limits` - Limites por adquirente e tipo de transação
    
  3. Security
    - Manter RLS existente
*/

-- Remover constraint de única adquirente ativa
DROP INDEX IF EXISTS idx_seller_acquirer_assignments_unique_active;

-- Adicionar campos de prioridade e status em seller_acquirer_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_acquirer_assignments' AND column_name = 'priority'
  ) THEN
    ALTER TABLE seller_acquirer_assignments 
    ADD COLUMN priority integer DEFAULT 1 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_acquirer_assignments' AND column_name = 'weight'
  ) THEN
    ALTER TABLE seller_acquirer_assignments 
    ADD COLUMN weight integer DEFAULT 100 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_acquirer_assignments' AND column_name = 'last_failure_at'
  ) THEN
    ALTER TABLE seller_acquirer_assignments 
    ADD COLUMN last_failure_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_acquirer_assignments' AND column_name = 'failure_count'
  ) THEN
    ALTER TABLE seller_acquirer_assignments 
    ADD COLUMN failure_count integer DEFAULT 0;
  END IF;
END $$;

-- Criar tabela de limites por adquirente
CREATE TABLE IF NOT EXISTS acquirer_transaction_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquirer_id uuid NOT NULL REFERENCES payment_acquirers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('cash_in', 'cash_out', 'deposit')),
  min_amount decimal(10, 2) DEFAULT 1.00 NOT NULL,
  max_amount decimal(10, 2),
  daily_limit decimal(15, 2),
  monthly_limit decimal(15, 2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(acquirer_id, transaction_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_seller_acquirer_priority 
  ON seller_acquirer_assignments(user_id, priority, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_acquirer_limits 
  ON acquirer_transaction_limits(acquirer_id, transaction_type, is_active) 
  WHERE is_active = true;

-- Adicionar campo acquirer_id em deposits se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deposits' AND column_name = 'acquirer_id'
  ) THEN
    ALTER TABLE deposits 
    ADD COLUMN acquirer_id uuid REFERENCES payment_acquirers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deposits' AND column_name = 'attempt_number'
  ) THEN
    ALTER TABLE deposits 
    ADD COLUMN attempt_number integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deposits' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE deposits 
    ADD COLUMN failure_reason text;
  END IF;
END $$;

-- Adicionar campos de métricas em transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'acquirer_id'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN acquirer_id uuid REFERENCES payment_acquirers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'admin_fee_amount'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN admin_fee_amount decimal(10, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- RLS Policies para acquirer_transaction_limits
ALTER TABLE acquirer_transaction_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage acquirer limits"
  ON acquirer_transaction_limits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view their acquirer limits"
  ON acquirer_transaction_limits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_acquirer_assignments saa
      WHERE saa.acquirer_id = acquirer_transaction_limits.acquirer_id
      AND saa.user_id = auth.uid()
      AND saa.is_active = true
    )
  );

-- Criar view para admin dashboard com métricas
CREATE OR REPLACE VIEW admin_metrics AS
SELECT
  COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'cash_in' AND t.status = 'paid') as total_cash_in_transactions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.type = 'cash_out' AND t.status = 'paid') as total_cash_out_transactions,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'cash_in' AND t.status = 'paid'), 0) as total_cash_in_volume,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'cash_out' AND t.status = 'paid'), 0) as total_cash_out_volume,
  COALESCE(SUM(t.admin_fee_amount) FILTER (WHERE t.status = 'paid'), 0) as total_admin_fees,
  COALESCE(SUM(t.fee_amount) FILTER (WHERE t.status = 'paid'), 0) as total_fees_collected,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'paid') as total_deposits_completed,
  COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'paid'), 0) as total_deposits_volume,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'pending') as pending_deposits,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'seller' AND u.kyc_status = 'approved') as active_sellers
FROM transactions t
FULL OUTER JOIN deposits d ON true
FULL OUTER JOIN users u ON true;

-- Grant para authenticated users visualizarem as métricas
GRANT SELECT ON admin_metrics TO authenticated;
