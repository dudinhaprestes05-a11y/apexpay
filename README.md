# Apex Payment Gateway

Sistema completo de gateway de pagamentos com painéis Admin e Seller, integração PodPay e multi-adquirentes.

## 🚀 Deploy Rápido

### Opção 1: Script Automático

```bash
./deploy.sh
```

Isso vai:
1. ✅ Fazer build do frontend
2. ✅ Criar estrutura unificada em `public_html/`
3. ✅ Configurar roteamento (.htaccess)
4. ✅ Preparar pastas de storage

### Opção 2: Manual

```bash
npm run build
mkdir -p public_html/api
cp -r dist/* public_html/
cp -r backend/public/* public_html/api/
cp -r backend/{core,controllers,models,services,middleware,config} public_html/api/
cp backend/.env public_html/api/
```

## 📋 Próximos Passos

Após rodar o deploy:

1. **Configure o banco** - Edite `public_html/api/.env`
2. **Faça upload** - Envie `public_html/` para seu servidor
3. **Execute migrações** - `php api/migrate.php`
4. **Crie admin** - `php api/create-admin.php admin@email.com senha`

## 📖 Documentação

- **[START_HERE.md](START_HERE.md)** - 🎯 Comece aqui! Deploy em 5 minutos
- **[PLESK_FIX.md](PLESK_FIX.md)** - 🔧 Correções para servidor Plesk
- **[DEPLOY.md](DEPLOY.md)** - Guia completo de deploy em produção
- **[LEIA-ME-PRIMEIRO.md](LEIA-ME-PRIMEIRO.md)** - Setup local para desenvolvimento
- **[PHP_BACKEND_SETUP.md](PHP_BACKEND_SETUP.md)** - Configuração do backend PHP
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - Detalhes da arquitetura

## 🌐 Estrutura de URLs

Após deploy:

- `/` - Login
- `/admin` - Dashboard Admin
- `/seller` - Dashboard Seller
- `/api/*` - API REST

## 🛠️ Desenvolvimento Local

```bash
# Backend
cd backend/public
php -S localhost:8000

# Frontend (outro terminal)
npm install
npm run dev
```

Acesse: http://localhost:5173

## 📦 Tecnologias

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

**Backend:**
- PHP 8.0+
- MySQL 5.7+
- JWT Authentication
- RESTful API

## 🔒 Segurança

Em produção, configure:
- SSL/HTTPS
- JWT_SECRET forte
- APP_DEBUG=false
- Firewall
- Backups automáticos

## 📞 Suporte

Consulte os arquivos de documentação em `/` ou entre em contato com o time de desenvolvimento.

---

**Versão:** 1.0.0
**Última atualização:** 2025-11-27
