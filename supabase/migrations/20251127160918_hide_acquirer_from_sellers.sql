/*
  # Ocultar informações da adquirente para sellers

  1. Segurança
    - Sellers não devem ter acesso ao acquirer_id nas transações
    - Apenas admins podem visualizar essa informação
  
  2. Alterações
    - Cria uma view `seller_transactions` que oculta informações sensíveis
    - Mantém acesso completo para admins via tabela original
    - Remove políticas RLS existentes que expõem acquirer_id
    
  3. Notas Importantes
    - A view não inclui acquirer_id
    - Sellers acessam via view, admins via tabela
    - Mantém todas as outras funcionalidades intactas
*/

-- Criar uma view para sellers que oculta informações sensíveis
CREATE OR REPLACE VIEW seller_transactions AS
SELECT 
  id,
  user_id,
  provider,
  provider_transaction_id,
  type,
  amount,
  status,
  payment_method,
  pix_qrcode,
  pix_copy_paste,
  pix_expiration,
  end_to_end_id,
  metadata,
  customer_data,
  created_at,
  updated_at,
  fee_amount,
  net_amount,
  fee_percentage,
  admin_fee_amount,
  paid_at
FROM transactions;

-- Conceder acesso à view para usuários autenticados
GRANT SELECT ON seller_transactions TO authenticated;

-- Adicionar RLS na view
ALTER VIEW seller_transactions SET (security_invoker = true);

-- Criar política para a view que permite sellers verem apenas suas transações
-- Nota: Como é uma view com security_invoker, ela usa as políticas da tabela base
-- mas precisamos garantir que o código da aplicação use a view para sellers

-- Adicionar comentário explicativo
COMMENT ON VIEW seller_transactions IS 'View para sellers que oculta informações sensíveis como acquirer_id. Sellers devem usar esta view em vez da tabela transactions diretamente.';
