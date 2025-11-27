# Payment Gateway Backend - PHP Puro

Backend completo em PHP puro (sem frameworks) para sistema de gateway de pagamento com suporte a múltiplas adquirentes, KYC, carteira digital e webhooks PodPay.

## Requisitos

- PHP 8.0 ou superior
- MySQL 8.0 ou superior
- Extensões PHP:
  - pdo_mysql
  - json
  - curl
  - mbstring
  - openssl
- Servidor web: Apache ou Nginx
- Plesk (recomendado para deploy)

## Estrutura do Projeto

```
backend/
├── public/              # Entry point (document root)
│   ├── index.php
│   └── .htaccess
├── config/              # Configurações
│   ├── app.php
│   ├── database.php
│   ├── cors.php
│   └── routes.php
├── core/                # Framework core
│   ├── Database.php
│   ├── Router.php
│   ├── Request.php
│   ├── Response.php
│   ├── Auth.php
│   └── Validator.php
├── controllers/         # Controllers
├── models/              # Models
├── services/            # Business logic
├── middleware/          # Middleware
├── database/            # Migrations & seeds
└── storage/             # Logs, uploads, cache
```

## Instalação Local

### 1. Clone o Repositório

```bash
cd /seu/diretorio
```

### 2. Configurar Banco de Dados

Crie um banco MySQL:

```sql
CREATE DATABASE payment_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gateway_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON payment_gateway.* TO 'gateway_user'@'localhost';
FLUSH PRIVILEGES;
```

Execute o schema:

```bash
mysql -u gateway_user -p payment_gateway < database/schema.sql
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=payment_gateway
DB_USER=gateway_user
DB_PASS=sua_senha_segura

APP_ENV=production
APP_DEBUG=false
APP_URL=https://seudominio.com
APP_TIMEZONE=America/Sao_Paulo

JWT_SECRET=gere-uma-chave-secreta-aleatoria-muito-segura
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

CORS_ALLOWED_ORIGINS=https://seudominio.com
```

**Gerar JWT Secret:**

```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

### 4. Configurar Permissões

```bash
chmod -R 755 backend/
chmod -R 775 backend/storage/
chmod 600 backend/.env
```

### 5. Criar Usuário Admin

Execute este SQL no MySQL:

```sql
INSERT INTO users (id, email, password_hash, name, role, kyc_status)
VALUES (
  UUID(),
  'admin@seudominio.com',
  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: password
  'Administrador',
  'admin',
  'approved'
);
```

**IMPORTANTE:** Altere a senha após o primeiro login!

## Deploy no Plesk

### 1. Preparar Ambiente

1. Acesse seu painel Plesk
2. Crie um novo domínio ou subdomínio (ex: api.seudominio.com)
3. Configure PHP 8.0+ para o domínio

### 2. Upload dos Arquivos

Via FTP/SFTP ou File Manager do Plesk:

```
/httpdocs/
├── api/                 # Todo o conteúdo do backend/
└── (outros arquivos)
```

**Estrutura no Plesk:**

```
/httpdocs/api/
├── public/
├── config/
├── core/
├── controllers/
├── models/
├── services/
├── middleware/
├── database/
├── storage/
└── .env
```

### 3. Configurar Document Root

No Plesk:

1. Vá em "Hosting Settings"
2. Altere "Document root" para: `/httpdocs/api/public`
3. Salve

### 4. Configurar Banco de Dados

No Plesk:

1. Vá em "Databases" → "Add Database"
2. Nome: `payment_gateway`
3. Crie usuário com permissões completas
4. Anote: host, database, user, password
5. Use phpMyAdmin para importar o schema:
   - Selecione o banco
   - Vá em "Import"
   - Envie `database/schema.sql`
   - Execute

### 5. Configurar .env

No File Manager do Plesk, edite `/httpdocs/api/.env` com as credenciais corretas.

### 6. Configurar SSL

No Plesk:

1. Vá em "SSL/TLS Certificates"
2. Instale Let's Encrypt (gratuito)
3. Force HTTPS

### 7. Testar API

Teste o endpoint de health check:

```bash
curl https://api.seudominio.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seudominio.com","password":"password"}'
```

Resposta esperada:

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {...},
    "token": "...",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

## Endpoints Disponíveis

### Autenticação

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro de seller
- `POST /api/auth/refresh` - Refresh token

### Seller (requer autenticação)

- `GET /api/seller/dashboard` - Dashboard do seller
- `GET /api/seller/profile` - Perfil do usuário
- `PUT /api/seller/profile` - Atualizar perfil
- `GET /api/seller/wallet` - Carteira
- `GET /api/seller/transactions` - Transações
- `POST /api/seller/deposits` - Criar depósito
- `GET /api/seller/deposits` - Listar depósitos

### Admin (requer autenticação + role admin)

- `GET /api/admin/dashboard` - Dashboard admin
- `GET /api/admin/sellers` - Listar sellers
- `PUT /api/admin/sellers/{id}` - Atualizar seller
- `GET /api/admin/transactions` - Todas transações
- `GET /api/admin/acquirers` - Listar adquirentes
- `POST /api/admin/acquirers` - Criar adquirente
- `PUT /api/admin/acquirers/{id}` - Atualizar adquirente
- `DELETE /api/admin/acquirers/{id}` - Remover adquirente
- `GET /api/admin/webhooks/logs` - Logs de webhooks

### Webhooks

- `POST /api/webhooks/podpay` - Webhook PodPay

## Autenticação

Todas as rotas protegidas requerem header:

```
Authorization: Bearer {token}
```

Tokens JWT expiram em 24h. Use o refresh token para obter um novo.

## Criar Adquirente PodPay

Via API (como admin):

```bash
curl https://api.seudominio.com/api/admin/acquirers \
  -X POST \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PodPay Principal",
    "provider_type": "podpay",
    "public_key": "sua_public_key_podpay",
    "secret_key": "sua_secret_key_podpay",
    "environment": "sandbox",
    "is_active": true
  }'
```

## Atribuir Adquirente a Seller

Via SQL (por enquanto):

```sql
INSERT INTO seller_acquirer_assignments (id, user_id, acquirer_id, priority, weight, is_active)
VALUES (
  UUID(),
  'seller_user_id',
  'acquirer_id',
  1,
  100,
  TRUE
);
```

## Logs e Debug

### Ver Logs

```bash
tail -f storage/logs/app.log
tail -f storage/logs/error.log
```

### Ativar Debug Mode

No `.env`:

```env
APP_DEBUG=true
```

**NUNCA ative debug em produção!**

## Segurança

### Checklist de Segurança

- [ ] Alterar senha do admin padrão
- [ ] Gerar novo JWT_SECRET forte
- [ ] Configurar CORS apenas para domínio do frontend
- [ ] SSL/HTTPS ativado e forçado
- [ ] .env com permissões 600
- [ ] storage/ não acessível via web
- [ ] APP_DEBUG=false em produção
- [ ] Firewall configurado (apenas portas 80, 443, 22)
- [ ] Backup automático do banco configurado

## Troubleshooting

### Erro: "Database connection failed"

- Verifique credenciais no `.env`
- Teste conexão: `mysql -h HOST -u USER -p DATABASE`
- Verifique se extensão pdo_mysql está ativa: `php -m | grep pdo_mysql`

### Erro 500 Internal Server Error

- Verifique logs: `storage/logs/` ou logs do PHP no Plesk
- Verifique permissões de arquivos
- Ative temporariamente `APP_DEBUG=true`

### Webhook não está funcionando

- Verifique logs: `SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10`
- URL do webhook deve ser acessível publicamente
- Verifique firewall

### CORS Error no Frontend

- Verifique `CORS_ALLOWED_ORIGINS` no `.env`
- Adicione domínio do frontend

## Backup

### Backup do Banco

```bash
mysqldump -u gateway_user -p payment_gateway > backup_$(date +%Y%m%d).sql
```

### Backup Automático no Plesk

1. Vá em "Backup Manager"
2. Configure backup automático diário
3. Inclua banco de dados e arquivos

## Manutenção

### Limpar Logs Antigos

```bash
find storage/logs/ -name "*.log" -mtime +30 -delete
```

### Limpar Cache

```bash
rm -rf storage/cache/*
```

### Monitorar Performance

- Use New Relic, Datadog ou similar
- Configure alertas para erros
- Monitore uso de CPU/RAM/Disco

## Suporte

Para questões técnicas, consulte a documentação ou abra um issue no repositório.

## Licença

Proprietário - Todos os direitos reservados
