# Apex Payment Gateway

Gateway de pagamentos com integração PodPay, painéis Admin e Seller.

## Estrutura do Projeto

```
/
├── src/              # Frontend React + TypeScript
├── httpdocs/         # Raiz pública (gerado pelo build)
│   ├── index.html    # SPA compilado
│   ├── assets/       # CSS/JS compilados
│   └── api/          # Backend PHP
└── deploy.sh         # Script de deploy
```

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar frontend
npm run dev

# Backend (outro terminal)
cd httpdocs/api
php -S localhost:8000 -t .
```

Acesse: http://localhost:5173

## Deploy

### No Servidor

```bash
# 1. Instalar Node.js (se necessário)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. Fazer deploy
./deploy.sh
```

### Configuração Backend

Edite `httpdocs/api/.env`:

```env
DB_HOST=localhost
DB_NAME=apex
DB_USER=apex
DB_PASS=sua_senha

APP_URL=https://apexpay.duckdns.org
CORS_ALLOWED_ORIGINS=https://apexpay.duckdns.org

JWT_SECRET=gerar_com_openssl_rand_base64_32
```

### Migração e Admin

```bash
cd httpdocs/api
php migrate.php
php create-admin.php admin@email.com senha123
```

## Tecnologias

Frontend: React 18 + TypeScript + Vite + Tailwind CSS
Backend: PHP 8.0+ + MySQL 5.7+ + JWT

## URLs

- `/` - Login
- `/admin/*` - Dashboard Admin
- `/seller/*` - Dashboard Seller
- `/api/*` - API REST
