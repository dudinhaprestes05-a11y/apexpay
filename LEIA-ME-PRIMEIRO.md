# 🚀 LEIA-ME PRIMEIRO - Sistema Full PHP + MySQL

## ✨ Migração Concluída!

O sistema foi **completamente migrado de Supabase para PHP + MySQL**. Agora você tem controle total sobre o backend!

---

## ⚡ Início Rápido (5 Minutos)

### 1️⃣ Instalar MySQL (se não tiver)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server php php-mysql php-mbstring php-json
```

**macOS:**
```bash
brew install mysql php
brew services start mysql
```

**Windows:**
- Baixe [XAMPP](https://www.apachefriends.org/) ou [WampServer](https://www.wampserver.com/)

### 2️⃣ Criar Banco de Dados

```bash
mysql -u root -p
```

```sql
CREATE DATABASE apex CHARACTER SET utf8mb4;
CREATE USER 'apex'@'localhost' IDENTIFIED BY 'senha123';
GRANT ALL PRIVILEGES ON apex.* TO 'apex'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3️⃣ Configurar Backend

```bash
cd backend
nano .env  # ou use qualquer editor
```

Edite estas linhas:
```env
DB_HOST=localhost
DB_NAME=apex
DB_USER=apex
DB_PASS=senha123

APP_DEBUG=true
JWT_SECRET=mude-isto-para-algo-seguro-em-producao
```

### 4️⃣ Criar Tabelas

```bash
php test-connection.php  # Deve dizer "Conexão OK"
php migrate.php          # Cria todas as tabelas
```

### 5️⃣ Criar Usuário Admin

```bash
php create-admin.php admin@admin.com admin123
```

**⚠️ IMPORTANTE:** Salve o email e senha!

### 6️⃣ Iniciar Backend

```bash
cd public
php -S localhost:8000
```

Deixe este terminal aberto! ✋

### 7️⃣ Iniciar Frontend (Novo Terminal)

```bash
npm install
npm run dev
```

### 8️⃣ Acessar Sistema

Abra seu navegador em: **http://localhost:5173**

Login com:
- Email: `admin@admin.com`
- Senha: `admin123`

---

## 📁 Estrutura do Projeto

```
seu-projeto/
├── backend/                    # 🔥 Backend PHP (API REST)
│   ├── config/                # Configurações
│   ├── controllers/           # Controladores da API
│   ├── models/               # Models do banco
│   ├── services/             # Serviços (PodPay, etc)
│   ├── public/               # Entrada pública (index.php)
│   ├── .env                  # ⚙️ CONFIGURE AQUI
│   ├── migrate.php           # Script de migração
│   └── create-admin.php      # Criar admin
│
├── src/                       # 💻 Frontend React
│   ├── lib/api.ts            # Cliente HTTP
│   ├── services/             # Serviços da API
│   ├── contexts/             # React Context
│   ├── pages/                # Páginas
│   └── components/           # Componentes
│
├── .env                       # Config do frontend
├── PHP_BACKEND_SETUP.md      # 📖 Guia detalhado
├── MIGRATION_COMPLETE.md     # ✅ Resumo da migração
└── LEIA-ME-PRIMEIRO.md       # 👈 Você está aqui!
```

---

## 🎯 Endpoints da API

Todos os endpoints estão em: `http://localhost:8000/api/`

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrar seller
- `POST /api/auth/refresh` - Refresh token

### Admin
- `GET /api/admin/dashboard` - Estatísticas
- `GET /api/admin/sellers` - Listar sellers
- `GET /api/admin/acquirers` - Listar adquirentes
- `POST /api/admin/acquirers` - Criar adquirente
- `GET /api/admin/transactions` - Todas as transações
- `GET /api/admin/webhooks/logs` - Logs de webhooks

### Seller
- `GET /api/seller/dashboard` - Dashboard do seller
- `GET /api/seller/profile` - Perfil
- `GET /api/seller/wallet` - Carteira
- `GET /api/seller/transactions` - Transações
- `POST /api/seller/deposits` - Criar depósito

### Webhooks
- `POST /api/webhooks/podpay` - Webhook PodPay

---

## 🔧 Comandos Úteis

### Backend

```bash
# Testar conexão com banco
php test-connection.php

# Recriar banco (⚠️ APAGA TUDO!)
php migrate.php

# Criar novo admin
php create-admin.php email@example.com senha123

# Iniciar servidor
cd public && php -S localhost:8000
```

### Frontend

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Verificar tipos TypeScript
npm run typecheck
```

---

## ❓ Problemas Comuns

### "Connection refused" ao fazer login

**Problema:** Backend não está rodando

**Solução:**
```bash
cd backend/public
php -S localhost:8000
```

### "Access denied for user"

**Problema:** Senha do MySQL incorreta

**Solução:**
1. Edite `backend/.env`
2. Corrija `DB_PASS=`
3. Teste: `php test-connection.php`

### "Table doesn't exist"

**Problema:** Migrações não foram executadas

**Solução:**
```bash
cd backend
php migrate.php
```

### CORS Error no navegador

**Problema:** CORS não configurado

**Solução:**
1. Edite `backend/.env`
2. Adicione: `CORS_ALLOWED_ORIGINS=http://localhost:5173`
3. Reinicie o backend

### Página em branco

**Problema:** Frontend não encontra a API

**Solução:**
1. Verifique se backend está rodando: `http://localhost:8000`
2. Verifique `.env` na raiz: `VITE_API_URL=http://localhost:8000/api`
3. Reinicie o frontend: `npm run dev`

---

## 🚀 Deploy em Produção

Quando estiver pronto para produção, consulte:
- `PHP_BACKEND_SETUP.md` - Seção "Segurança em Produção"

**Checklist:**
- [ ] Mudar `APP_ENV=production` no backend
- [ ] Mudar `APP_DEBUG=false`
- [ ] Gerar `JWT_SECRET` forte e aleatória
- [ ] Configurar HTTPS (SSL/TLS)
- [ ] Usar Apache ou Nginx (não PHP built-in)
- [ ] Configurar firewall
- [ ] Backups automáticos do banco
- [ ] Monitoramento de logs

---

## 📚 Documentação Completa

1. **`PHP_BACKEND_SETUP.md`** - Setup detalhado do backend
2. **`MIGRATION_COMPLETE.md`** - Resumo técnico da migração
3. **`backend/README.md`** - Documentação específica do backend
4. **`backend/COMMANDS.md`** - Lista de comandos do backend

---

## 🆘 Precisa de Ajuda?

1. Verifique a documentação acima
2. Consulte os arquivos `.md` na raiz e em `backend/`
3. Verifique os logs:
   - Backend: Terminal onde o PHP está rodando
   - Frontend: Console do navegador (F12)
   - MySQL: `/var/log/mysql/error.log` (Linux)

---

## ✅ Status do Sistema

| Componente | Status |
|-----------|--------|
| Frontend React | ✅ Pronto |
| Cliente HTTP | ✅ Implementado |
| Services (API) | ✅ Criados |
| AuthContext | ✅ Migrado |
| Backend PHP | ✅ Disponível |
| Rotas API | ✅ Configuradas |
| MySQL Schema | ✅ Pronto |
| Build | ✅ Funciona |
| Documentação | ✅ Completa |

---

## 🎉 Pronto para Usar!

Siga os 8 passos do **Início Rápido** no topo deste arquivo e você terá o sistema rodando em minutos!

**Boa sorte!** 🚀

---

_Última atualização: Sistema 100% migrado para PHP + MySQL_
