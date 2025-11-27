# PHP Backend Setup Guide

## Overview

O sistema foi migrado de Supabase para PHP + MySQL. Este guia explica como configurar e iniciar o backend PHP.

## Requisitos

- PHP 8.0 ou superior
- MySQL 5.7 ou superior / MariaDB 10.3 ou superior
- Extensões PHP:
  - pdo_mysql
  - json
  - openssl
  - mbstring
- Composer (opcional, mas recomendado para dependências futuras)

## Estrutura do Backend

```
backend/
├── config/          # Configurações (database, routes, CORS)
├── controllers/     # Controladores da API
├── core/           # Classes core (Router, Auth, Database)
├── middleware/     # Middlewares (Auth, CORS, RateLimit)
├── models/         # Models do banco de dados
├── public/         # Ponto de entrada público
├── services/       # Serviços (PodPay, Webhooks)
├── database/       # Schema SQL
├── .env            # Variáveis de ambiente
├── migrate.php     # Script de migração
├── create-admin.php # Script para criar admin
└── test-connection.php # Teste de conexão
```

## Passo 1: Configurar o Banco de Dados

### 1.1. Criar o Banco de Dados MySQL

```sql
CREATE DATABASE apex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'apex'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON apex.* TO 'apex'@'localhost';
FLUSH PRIVILEGES;
```

### 1.2. Configurar o arquivo `.env`

Edite o arquivo `backend/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=apex
DB_USER=apex
DB_PASS=sua_senha_aqui

# Application
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=America/Sao_Paulo

# JWT (IMPORTANTE: Mude em produção!)
JWT_SECRET=change-this-to-a-random-secure-key-in-production
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# Storage
STORAGE_PATH=../storage
UPLOAD_MAX_SIZE=10485760
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png

# PodPay
PODPAY_SANDBOX_URL=https://sandbox.podpay.co
PODPAY_PRODUCTION_URL=https://api.podpay.co

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_WINDOW=60

# Logs
LOG_LEVEL=info
LOG_PATH=../storage/logs
```

## Passo 2: Executar as Migrações

```bash
cd backend
php test-connection.php  # Testar conexão com o banco
php migrate.php          # Criar todas as tabelas
```

Se tudo estiver correto, você verá:

```
✓ Conexão com banco de dados estabelecida
✓ Todas as tabelas foram criadas com sucesso
```

## Passo 3: Criar Usuário Administrador

```bash
php create-admin.php admin@example.com SenhaSegura123
```

Salve as credenciais exibidas!

## Passo 4: Iniciar o Servidor PHP

### Opção 1: Servidor Embutido do PHP (Desenvolvimento)

```bash
cd backend/public
php -S localhost:8000
```

### Opção 2: Apache

Configure um VirtualHost:

```apache
<VirtualHost *:80>
    ServerName apex-gateway.local
    DocumentRoot /caminho/para/backend/public

    <Directory /caminho/para/backend/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/apex-error.log
    CustomLog ${APACHE_LOG_DIR}/apex-access.log combined
</VirtualHost>
```

Habilite o mod_rewrite:

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Opção 3: Nginx

Configure o server block:

```nginx
server {
    listen 80;
    server_name apex-gateway.local;
    root /caminho/para/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Passo 5: Configurar o Frontend

O frontend já está configurado para usar a API PHP.

Edite o arquivo `.env` na raiz do projeto (se necessário):

```env
VITE_API_URL=http://localhost:8000/api
```

## Passo 6: Testar o Sistema

### 6.1. Testar a API diretamente

```bash
# Teste de health check (se implementado)
curl http://localhost:8000/api/health

# Teste de login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SenhaSegura123"}'
```

### 6.2. Iniciar o Frontend

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## Endpoints da API

### Autenticação

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro de seller
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário autenticado

### Admin

- `GET /api/admin/dashboard` - Dashboard com estatísticas
- `GET /api/admin/sellers` - Listar sellers
- `GET /api/admin/sellers/{id}` - Detalhes do seller
- `PUT /api/admin/sellers/{id}` - Atualizar seller
- `GET /api/admin/acquirers` - Listar adquirentes
- `POST /api/admin/acquirers` - Criar adquirente
- `PUT /api/admin/acquirers/{id}` - Atualizar adquirente
- `DELETE /api/admin/acquirers/{id}` - Deletar adquirente
- `GET /api/admin/transactions` - Listar todas as transações
- `GET /api/admin/webhooks/logs` - Logs de webhooks

### Seller

- `GET /api/seller/dashboard` - Dashboard do seller
- `GET /api/seller/profile` - Perfil do seller
- `PUT /api/seller/profile` - Atualizar perfil
- `GET /api/seller/wallet` - Saldo da carteira
- `GET /api/seller/wallet/history` - Histórico da carteira
- `GET /api/seller/transactions` - Transações do seller
- `GET /api/seller/transactions/{id}` - Detalhes da transação
- `GET /api/seller/deposits` - Listar depósitos
- `POST /api/seller/deposits` - Criar depósito

### Webhooks

- `POST /api/webhooks/podpay` - Webhook do PodPay

## Estrutura do Banco de Dados

Principais tabelas criadas:

- `users` - Usuários (admin e sellers)
- `wallets` - Carteiras dos sellers
- `wallet_transactions` - Histórico de transações da carteira
- `transactions` - Transações de pagamento
- `deposits` - Depósitos
- `payment_acquirers` - Adquirentes de pagamento
- `seller_acquirer_assignments` - Atribuição de adquirentes por seller
- `seller_fees` - Taxas personalizadas por seller
- `seller_configs` - Configurações por seller
- `kyc_documents` - Documentos KYC
- `webhook_logs` - Logs de webhooks

## Troubleshooting

### Erro: "Connection refused"

- Verifique se o MySQL está rodando: `sudo systemctl status mysql`
- Verifique as credenciais no `.env`

### Erro: "Class not found"

- Verifique se todos os arquivos estão no lugar correto
- Certifique-se de que o autoloader está funcionando

### Erro: "CORS"

- Verifique `CORS_ALLOWED_ORIGINS` no `.env`
- Adicione a origem do frontend

### Erro: "Permission denied" ao fazer upload

```bash
cd backend
mkdir -p storage/uploads storage/logs
chmod -R 775 storage
```

## Segurança em Produção

Antes de colocar em produção:

1. Mude `APP_ENV` para `production`
2. Defina `APP_DEBUG` como `false`
3. Gere uma `JWT_SECRET` forte e aleatória
4. Use HTTPS (configure SSL/TLS)
5. Configure firewall para proteger o banco de dados
6. Use senhas fortes para o banco de dados
7. Configure backup automático do banco
8. Monitore os logs regularmente

## Próximos Passos

1. Implementar endpoints faltantes conforme necessário
2. Adicionar testes automatizados
3. Configurar CI/CD
4. Implementar monitoramento e alertas
5. Documentar a API com Swagger/OpenAPI

## Suporte

Para dúvidas sobre a API PHP, consulte:
- `backend/README.md`
- `backend/COMMANDS.md`
- `backend/SETUP_INSTRUCTIONS.md`
