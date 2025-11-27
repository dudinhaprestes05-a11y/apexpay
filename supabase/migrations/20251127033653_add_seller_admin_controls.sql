/*
  # Adicionar Controles Administrativos para Vendedores

  1. Alterações na tabela users
    - `account_status` - Status geral da conta (active, suspended, banned_temporary, banned_permanent)
    - `account_status_reason` - Motivo do status atual
    - `withdrawals_blocked` - Bloquear saques (boolean)
    - `withdrawals_blocked_reason` - Motivo do bloqueio de saques
    - `deposits_blocked` - Bloquear depósitos (boolean)
    - `deposits_blocked_reason` - Motivo do bloqueio de depósitos
    - `transactions_blocked` - Bloquear transações (boolean)
    - `transactions_blocked_reason` - Motivo do bloqueio de transações
    - `suspension_expires_at` - Data de expiração da suspensão temporária
    - `last_status_change_by` - ID do admin que fez a última mudança
    - `last_status_change_at` - Data da última mudança de status

  2. Nova tabela: seller_action_logs
    - Registra todas as ações administrativas tomadas
    - Histórico completo de bloqueios, suspensões, banimentos

  3. Security
    - RLS policies para proteger dados sensíveis
    - Apenas admins podem modificar status
*/

-- Adicionar novos campos na tabela users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE users ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned_temporary', 'banned_permanent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_status_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN account_status_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'withdrawals_blocked'
  ) THEN
    ALTER TABLE users ADD COLUMN withdrawals_blocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'withdrawals_blocked_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN withdrawals_blocked_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'deposits_blocked'
  ) THEN
    ALTER TABLE users ADD COLUMN deposits_blocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'deposits_blocked_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN deposits_blocked_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'transactions_blocked'
  ) THEN
    ALTER TABLE users ADD COLUMN transactions_blocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'transactions_blocked_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN transactions_blocked_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'suspension_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN suspension_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_status_change_by'
  ) THEN
    ALTER TABLE users ADD COLUMN last_status_change_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_status_change_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_status_change_at timestamptz;
  END IF;
END $$;

-- Criar tabela de logs de ações administrativas
CREATE TABLE IF NOT EXISTS seller_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES users(id),
  action_type text NOT NULL CHECK (action_type IN (
    'account_suspended',
    'account_banned_temp',
    'account_banned_permanent',
    'account_reactivated',
    'withdrawals_blocked',
    'withdrawals_unblocked',
    'deposits_blocked',
    'deposits_unblocked',
    'transactions_blocked',
    'transactions_unblocked',
    'kyc_approved',
    'kyc_rejected',
    'other'
  )),
  reason text,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index para buscar logs por vendedor
CREATE INDEX IF NOT EXISTS idx_seller_action_logs_seller_id ON seller_action_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_action_logs_admin_id ON seller_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_seller_action_logs_created_at ON seller_action_logs(created_at DESC);

-- RLS para seller_action_logs
ALTER TABLE seller_action_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all action logs"
  ON seller_action_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins podem inserir logs
CREATE POLICY "Admins can insert action logs"
  ON seller_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Sellers podem ver seus próprios logs
CREATE POLICY "Sellers can view their own logs"
  ON seller_action_logs FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Função para verificar se conta está ativa
CREATE OR REPLACE FUNCTION is_account_active(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT 
    account_status,
    suspension_expires_at
  INTO user_record
  FROM users
  WHERE id = user_id;

  -- Se não encontrou o usuário, retorna false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Se conta está ativa, retorna true
  IF user_record.account_status = 'active' THEN
    RETURN true;
  END IF;

  -- Se está banido permanentemente, retorna false
  IF user_record.account_status = 'banned_permanent' THEN
    RETURN false;
  END IF;

  -- Se está suspenso ou banido temporariamente, verifica expiração
  IF user_record.account_status IN ('suspended', 'banned_temporary') THEN
    IF user_record.suspension_expires_at IS NULL THEN
      RETURN false;
    END IF;
    
    -- Se a suspensão expirou, reativar automaticamente
    IF user_record.suspension_expires_at < now() THEN
      UPDATE users 
      SET account_status = 'active',
          suspension_expires_at = NULL
      WHERE id = user_id;
      RETURN true;
    END IF;
    
    RETURN false;
  END IF;

  -- Default: retorna true
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON COLUMN users.account_status IS 'Status geral da conta: active, suspended, banned_temporary, banned_permanent';
COMMENT ON COLUMN users.withdrawals_blocked IS 'Se true, vendedor não pode fazer saques';
COMMENT ON COLUMN users.deposits_blocked IS 'Se true, vendedor não pode fazer depósitos';
COMMENT ON COLUMN users.transactions_blocked IS 'Se true, vendedor não pode processar transações';
COMMENT ON COLUMN users.suspension_expires_at IS 'Data de expiração para suspensões temporárias';
COMMENT ON TABLE seller_action_logs IS 'Registro de todas as ações administrativas sobre vendedores';
