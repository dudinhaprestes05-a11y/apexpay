# Comandos Úteis - Payment Gateway

Referência rápida de comandos para gerenciar o sistema.

## 🔧 Comandos de Manutenção

### Backup do Banco de Dados

```bash
# Backup completo
mysqldump -u gateway_user -p payment_gateway > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup apenas estrutura (sem dados)
mysqldump -u gateway_user -p --no-data payment_gateway > schema_backup.sql

# Backup apenas dados
mysqldump -u gateway_user -p --no-create-info payment_gateway > data_backup.sql
```

### Restaurar Backup

```bash
mysql -u gateway_user -p payment_gateway < backup_20231127_120000.sql
```

### Limpar Logs Antigos

```bash
# Remover logs com mais de 30 dias
find storage/logs/ -name "*.log" -mtime +30 -delete

# Remover logs com mais de 7 dias
find storage/logs/ -name "*.log" -mtime +7 -delete
```

### Limpar Cache

```bash
rm -rf storage/cache/*
```

### Ver Logs em Tempo Real

```bash
tail -f storage/logs/app.log
tail -f storage/logs/error.log
```

## 👤 Gerenciamento de Usuários

### Criar Admin

```sql
INSERT INTO users (id, email, password_hash, name, role, kyc_status)
VALUES (
  UUID(),
  'admin@email.com',
  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Nome Admin',
  'admin',
  'approved'
);
```

### Alterar Senha de Usuário

```bash
# Gerar hash de nova senha
php -r "echo password_hash('nova_senha', PASSWORD_BCRYPT, ['cost' => 12]) . PHP_EOL;"
```

```sql
UPDATE users SET password_hash = 'hash_gerado' WHERE email = 'usuario@email.com';
```

### Aprovar KYC de Seller

```sql
UPDATE users SET kyc_status = 'approved' WHERE email = 'seller@email.com';
```

### Rejeitar KYC de Seller

```sql
UPDATE users
SET kyc_status = 'rejected', rejection_reason = 'Documentos ilegíveis'
WHERE email = 'seller@email.com';
```

### Listar Sellers Pendentes de KYC

```sql
SELECT id, name, email, document_cpf_cnpj, created_at
FROM users
WHERE role = 'seller' AND kyc_status = 'pending'
ORDER BY created_at ASC;
```

## 💰 Gerenciamento de Carteira

### Ver Saldo de um Seller

```sql
SELECT u.name, u.email, w.balance, w.frozen_balance, w.total_fees_paid
FROM users u
JOIN wallets w ON u.id = w.user_id
WHERE u.email = 'seller@email.com';
```

### Creditar Manualmente (Ajuste de Saldo)

```sql
UPDATE wallets
SET balance = balance + 100.00
WHERE user_id = 'user_id_aqui';
```

### Congelar Saldo

```sql
UPDATE wallets
SET balance = balance - 50.00,
    frozen_balance = frozen_balance + 50.00
WHERE user_id = 'user_id_aqui';
```

### Descongelar Saldo

```sql
UPDATE wallets
SET balance = balance + 50.00,
    frozen_balance = frozen_balance - 50.00
WHERE user_id = 'user_id_aqui';
```

## 🏦 Gerenciamento de Adquirentes

### Criar Adquirente PodPay

```sql
INSERT INTO payment_acquirers (id, name, provider_type, public_key, secret_key, environment, is_active)
VALUES (
  UUID(),
  'PodPay Principal',
  'podpay',
  'pk_test_xxxxxxxxxxxx',
  'sk_test_xxxxxxxxxxxx',
  'sandbox',
  TRUE
);
```

### Listar Adquirentes

```sql
SELECT id, name, environment, is_active, created_at
FROM payment_acquirers
ORDER BY name;
```

### Desativar Adquirente

```sql
UPDATE payment_acquirers SET is_active = FALSE WHERE id = 'acquirer_id';
```

### Atribuir Adquirente a Seller

```sql
INSERT INTO seller_acquirer_assignments (id, user_id, acquirer_id, priority, weight, is_active)
VALUES (
  UUID(),
  'user_id_seller',
  'acquirer_id',
  1,
  100,
  TRUE
);
```

### Ver Adquirentes de um Seller

```sql
SELECT u.name as seller_name, pa.name as acquirer_name, saa.priority, saa.weight, saa.is_active
FROM seller_acquirer_assignments saa
JOIN users u ON saa.user_id = u.id
JOIN payment_acquirers pa ON saa.acquirer_id = pa.id
WHERE u.email = 'seller@email.com';
```

## 💳 Gerenciamento de Transações

### Listar Transações Recentes

```sql
SELECT t.id, u.name, t.type, t.amount, t.status, t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 50;
```

### Transações por Status

```sql
SELECT status, COUNT(*) as total, SUM(amount) as volume
FROM transactions
GROUP BY status;
```

### Transações de um Seller

```sql
SELECT t.id, t.type, t.amount, t.fee_amount, t.net_amount, t.status, t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.email = 'seller@email.com'
ORDER BY t.created_at DESC;
```

### Transações Hoje

```sql
SELECT COUNT(*) as total, SUM(amount) as volume
FROM transactions
WHERE DATE(created_at) = CURDATE();
```

### Forçar Status de Transação (Emergência)

```sql
UPDATE transactions
SET status = 'paid'
WHERE id = 'transaction_id';
```

## 📊 Relatórios e Analytics

### Dashboard Geral

```sql
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'seller') as total_sellers,
  (SELECT COUNT(*) FROM users WHERE kyc_status = 'pending') as pending_kyc,
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT SUM(amount) FROM transactions WHERE status = 'paid') as total_volume,
  (SELECT COUNT(*) FROM transactions WHERE status = 'paid') as paid_transactions;
```

### Top 10 Sellers por Volume

```sql
SELECT u.name, u.email, COUNT(t.id) as tx_count, SUM(t.amount) as total_volume
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.status = 'paid'
GROUP BY u.id
ORDER BY total_volume DESC
LIMIT 10;
```

### Transações por Dia (Últimos 30 dias)

```sql
SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as volume
FROM transactions
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Taxa de Sucesso por Adquirente

```sql
SELECT
  pa.name,
  COUNT(*) as total,
  SUM(CASE WHEN t.status = 'paid' THEN 1 ELSE 0 END) as paid,
  ROUND(SUM(CASE WHEN t.status = 'paid' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM transactions t
JOIN payment_acquirers pa ON t.acquirer_id = pa.id
GROUP BY pa.id
ORDER BY success_rate DESC;
```

## 🔍 Logs e Debug

### Ver Últimos Webhooks

```sql
SELECT id, provider, event_type, transaction_id, http_status, created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 50;
```

### Webhooks com Erro

```sql
SELECT * FROM webhook_logs
WHERE http_status >= 400
ORDER BY created_at DESC;
```

### Buscar Webhook por Transaction ID

```sql
SELECT * FROM webhook_logs
WHERE transaction_id = 'provider_transaction_id'
ORDER BY created_at DESC;
```

## 🔒 Segurança

### Listar Tentativas de Login Falhadas (Rate Limit)

```bash
grep "unauthorized" storage/logs/app.log | tail -50
```

### Ver IPs Bloqueados por Rate Limit

```bash
cat storage/cache/rate_limit.json | jq .
```

### Limpar Rate Limit de um IP

```bash
# Editar manualmente o arquivo
nano storage/cache/rate_limit.json
```

### Revogar API Keys de um Seller

```sql
UPDATE api_keys SET is_active = FALSE WHERE user_id = 'user_id';
```

## 🧹 Limpeza e Otimização

### Remover Transações Antigas (Pendentes > 30 dias)

```sql
DELETE FROM transactions
WHERE status = 'pending'
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Remover Depósitos Expirados

```sql
DELETE FROM deposits
WHERE status = 'expired'
AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Otimizar Tabelas

```sql
OPTIMIZE TABLE users, wallets, transactions, deposits, webhook_logs;
```

### Analisar Tamanho das Tabelas

```sql
SELECT
  TABLE_NAME,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'payment_gateway'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

## 🔄 Deployment

### Deploy Backend

```bash
# 1. Backup do banco
mysqldump -u gateway_user -p payment_gateway > backup_pre_deploy.sql

# 2. Upload arquivos
scp -r backend/ usuario@servidor:/httpdocs/api/

# 3. Ajustar permissões
ssh usuario@servidor "chmod -R 755 /httpdocs/api/ && chmod -R 775 /httpdocs/api/storage/"

# 4. Limpar cache
ssh usuario@servidor "rm -rf /httpdocs/api/storage/cache/*"
```

### Deploy Frontend

```bash
# 1. Build local
npm run build

# 2. Upload dist/
scp -r dist/* usuario@servidor:/httpdocs/

# 3. Limpar cache do navegador
# (adicionar ?v=timestamp nos assets)
```

## 📱 Comandos cURL para Testes

### Login

```bash
curl -X POST https://api.seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"password"}'
```

### Criar Depósito

```bash
curl -X POST https://api.seudominio.com/api/seller/deposits \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"amount":100.00,"description":"Teste"}'
```

### Listar Transações

```bash
curl https://api.seudominio.com/api/seller/transactions?limit=50 \
  -H "Authorization: Bearer {token}"
```

## 🆘 Recuperação de Emergência

### Sistema Não Responde

1. Verificar logs do PHP: `tail -f /var/log/php-fpm/error.log`
2. Verificar logs do Apache/Nginx: `tail -f /var/log/apache2/error.log`
3. Reiniciar serviços: `service apache2 restart` ou `service nginx restart`

### Banco de Dados Corrompido

```bash
# 1. Parar aplicação
# 2. Restaurar último backup
mysql -u gateway_user -p payment_gateway < backup_latest.sql
# 3. Verificar integridade
mysqlcheck -u gateway_user -p payment_gateway --check --all-databases
```

### Credenciais Perdidas

```bash
# Reset senha admin
php -r "echo password_hash('nova_senha', PASSWORD_BCRYPT, ['cost' => 12]);"
# Atualizar no banco
mysql -u root -p -e "UPDATE payment_gateway.users SET password_hash='hash_gerado' WHERE email='admin@email.com';"
```

## 📞 Suporte

Para problemas não cobertos aqui, consulte:
- [README.md](README.md) - Documentação completa
- [DEPLOYMENT_SUMMARY.md](../DEPLOYMENT_SUMMARY.md) - Visão geral do sistema
- Logs do sistema: `storage/logs/`
