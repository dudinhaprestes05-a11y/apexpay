# 🚀 Guia de Deploy - Frontend + Backend Unificado

## ✨ Estrutura Criada

O sistema agora está pronto para deploy com **Frontend e Backend no mesmo domínio**!

```
public_html/                    ← COPIE ESTA PASTA PARA SEU SERVIDOR
├── index.html                 ← Frontend React (Login, painéis)
├── assets/                    ← CSS e JS do frontend
│   ├── index-xxxxx.css
│   └── index-xxxxx.js
├── .htaccess                  ← Roteamento principal
└── api/                       ← Backend PHP (API REST)
    ├── index.php              ← Entrada da API
    ├── .htaccess              ← Roteamento da API
    ├── .env                   ← Configurações (EDITE ISTO!)
    ├── core/                  ← Classes core
    ├── controllers/           ← Controladores
    ├── models/                ← Models
    ├── services/              ← Serviços
    ├── middleware/            ← Middlewares
    ├── config/                ← Configurações
    ├── database/              ← Schema SQL
    └── storage/               ← Uploads e logs
        ├── uploads/
        └── logs/
```

---

## 📋 Pré-requisitos no Servidor

- **PHP 8.0+** com extensões: `pdo_mysql`, `json`, `openssl`, `mbstring`
- **MySQL 5.7+** ou **MariaDB 10.3+**
- **Apache** com `mod_rewrite` habilitado
- Acesso SSH ou FTP/SFTP

---

## 🚀 Deploy Passo a Passo

### **Passo 1: Preparar Banco de Dados**

Conecte ao MySQL do servidor:

```bash
mysql -u root -p
```

Execute:

```sql
CREATE DATABASE apex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'apex'@'localhost' IDENTIFIED BY 'SUA_SENHA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON apex.* TO 'apex'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### **Passo 2: Upload dos Arquivos**

#### Opção A: Via FTP/SFTP

1. Conecte ao servidor via FTP (FileZilla, WinSCP, etc)
2. Navegue até a pasta do seu site (ex: `/var/www/seudominio.com/` ou `/home/usuario/public_html/`)
3. Faça upload de **TODO o conteúdo** da pasta `public_html/` para a raiz

#### Opção B: Via SSH (mais rápido)

```bash
# No seu computador local (na pasta do projeto)
tar -czf deploy.tar.gz public_html/

# Copiar para servidor
scp deploy.tar.gz usuario@seu-servidor.com:/var/www/seudominio.com/

# No servidor
ssh usuario@seu-servidor.com
cd /var/www/seudominio.com
tar -xzf deploy.tar.gz
mv public_html/* .
rm -rf public_html deploy.tar.gz
```

---

### **Passo 3: Configurar Variáveis de Ambiente**

Edite o arquivo `.env` na pasta `api/`:

```bash
nano api/.env
```

**IMPORTANTE:** Altere estas configurações:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=apex
DB_USER=apex
DB_PASS=SUA_SENHA_AQUI        ← Mude isto!

# Application
APP_ENV=production             ← Mude para production!
APP_DEBUG=false                ← Desabilite debug!
APP_URL=https://seudominio.com ← Seu domínio!
APP_TIMEZONE=America/Sao_Paulo

# JWT (CRÍTICO: Mude para um valor aleatório!)
JWT_SECRET=gere-uma-chave-aleatoria-longa-e-segura-aqui-123456789
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

# CORS
CORS_ALLOWED_ORIGINS=https://seudominio.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# Storage
STORAGE_PATH=./storage
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
LOG_PATH=./storage/logs
```

**Para gerar JWT_SECRET seguro:**

```bash
openssl rand -base64 32
```

---

### **Passo 4: Configurar Permissões**

```bash
# Dar permissão de escrita ao Apache
chown -R www-data:www-data /var/www/seudominio.com
chmod -R 755 /var/www/seudominio.com

# Permissões especiais para storage
chmod -R 775 /var/www/seudominio.com/api/storage
```

**Se não tem acesso root:**

```bash
chmod -R 755 .
chmod -R 777 api/storage
```

---

### **Passo 5: Executar Migrações do Banco**

Via SSH:

```bash
cd /var/www/seudominio.com/api
php -f ../backend/migrate.php
```

**OU copie o script de migração:**

```bash
# No projeto local
scp backend/migrate.php usuario@servidor:/var/www/seudominio.com/api/

# No servidor
cd /var/www/seudominio.com/api
php migrate.php
```

Deve exibir:

```
✓ Conexão com banco de dados estabelecida
✓ Tabelas criadas com sucesso
```

---

### **Passo 6: Criar Usuário Administrador**

```bash
# Copiar script
scp backend/create-admin.php usuario@servidor:/var/www/seudominio.com/api/

# No servidor
cd /var/www/seudominio.com/api
php create-admin.php admin@seudominio.com SenhaSegura123
```

**⚠️ IMPORTANTE:** Anote o email e senha!

---

### **Passo 7: Configurar Apache**

#### **Opção A: Usando cPanel / Plesk / Painel de Controle**

1. Configure o **DocumentRoot** para a raiz onde você fez upload (ex: `public_html`)
2. Certifique-se que **mod_rewrite** está habilitado
3. Permita **.htaccess** override

#### **Opção B: Configuração Manual (VirtualHost)**

Edite o arquivo de configuração do Apache:

```bash
sudo nano /etc/apache2/sites-available/seudominio.com.conf
```

Adicione:

```apache
<VirtualHost *:80>
    ServerName seudominio.com
    ServerAlias www.seudominio.com
    DocumentRoot /var/www/seudominio.com

    <Directory /var/www/seudominio.com>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/apex-error.log
    CustomLog ${APACHE_LOG_DIR}/apex-access.log combined
</VirtualHost>
```

Habilite o site:

```bash
sudo a2enmod rewrite
sudo a2ensite seudominio.com
sudo systemctl restart apache2
```

---

### **Passo 8: Configurar SSL/HTTPS (Recomendado)**

#### **Com Let's Encrypt (Grátis):**

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d seudominio.com -d www.seudominio.com
```

#### **Após instalar SSL, atualize o `.env`:**

```env
APP_URL=https://seudominio.com
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

---

## ✅ Testar o Deploy

### **1. Teste a Raiz (Frontend)**

Acesse: `https://seudominio.com`

Deve carregar a **página de login** do sistema.

### **2. Teste a API**

```bash
curl -X POST https://seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seudominio.com","password":"SenhaSegura123"}'
```

Deve retornar JSON com token.

### **3. Teste Login no Painel**

1. Acesse: `https://seudominio.com`
2. Faça login com as credenciais do admin
3. Deve redirecionar para `/admin` (Dashboard Admin)

---

## 🎯 Estrutura de URLs Final

| URL | Descrição |
|-----|-----------|
| `https://seudominio.com/` | Página de login |
| `https://seudominio.com/admin` | Dashboard Admin |
| `https://seudominio.com/admin/sellers` | Gerenciar Sellers |
| `https://seudominio.com/admin/acquirers` | Gerenciar Adquirentes |
| `https://seudominio.com/seller` | Dashboard Seller |
| `https://seudominio.com/seller/wallet` | Carteira do Seller |
| `https://seudominio.com/api/auth/login` | API - Login |
| `https://seudominio.com/api/seller/*` | API - Endpoints Seller |
| `https://seudominio.com/api/admin/*` | API - Endpoints Admin |

---

## 🔧 Troubleshooting

### **Erro 500 - Internal Server Error**

**Causa:** Permissões incorretas ou mod_rewrite desabilitado

**Solução:**
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
chmod -R 755 /var/www/seudominio.com
```

### **Erro 404 na raiz**

**Causa:** .htaccess não está sendo lido

**Solução:** Verifique se `AllowOverride All` está configurado no VirtualHost

### **API retorna erro de conexão com banco**

**Causa:** Credenciais erradas no `.env`

**Solução:**
```bash
cd api
php -r "require 'core/Database.php'; new Database();"
```

Se falhar, corrija `api/.env`

### **CORS Error no navegador**

**Causa:** CORS_ALLOWED_ORIGINS incorreto

**Solução:** Edite `api/.env`:
```env
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

### **Erro de permissão ao fazer upload**

**Causa:** Pasta storage sem permissão de escrita

**Solução:**
```bash
chmod -R 775 api/storage
chown -R www-data:www-data api/storage
```

---

## 🔒 Checklist de Segurança em Produção

- [ ] `APP_ENV=production` no `.env`
- [ ] `APP_DEBUG=false` no `.env`
- [ ] `JWT_SECRET` alterado para valor aleatório e seguro
- [ ] Senha do MySQL forte
- [ ] SSL/HTTPS configurado
- [ ] Backup automático do banco configurado
- [ ] Logs monitorados regularmente
- [ ] Acesso SSH por chave (não senha)
- [ ] Firewall configurado
- [ ] Pasta `storage/` não acessível via web

---

## 📊 Monitoramento

### **Logs da Aplicação**

```bash
tail -f api/storage/logs/app.log
```

### **Logs do Apache**

```bash
tail -f /var/log/apache2/apex-error.log
```

### **Logs do MySQL**

```bash
tail -f /var/log/mysql/error.log
```

---

## 🔄 Atualizar o Sistema

Para atualizar após mudanças:

1. **Build local:**
   ```bash
   npm run build
   ```

2. **Recriar public_html:**
   ```bash
   rm -rf public_html
   mkdir -p public_html/api
   cp -r dist/* public_html/
   cp -r backend/public/* public_html/api/
   cp -r backend/{core,controllers,models,services,middleware,config} public_html/api/
   ```

3. **Upload:**
   ```bash
   rsync -avz --delete public_html/ usuario@servidor:/var/www/seudominio.com/
   ```

4. **NÃO sobrescrever:**
   - `api/.env` (configurações de produção)
   - `api/storage/` (uploads e logs)

---

## 📞 Suporte

Em caso de dúvidas:

1. Verifique os logs em `api/storage/logs/`
2. Teste a API com `curl`
3. Verifique permissões das pastas
4. Confirme que mod_rewrite está ativo

---

## 🎉 Deploy Concluído!

Seu sistema está pronto e rodando em:

**Frontend:** `https://seudominio.com`
**API:** `https://seudominio.com/api`

Acesse, faça login e comece a usar! 🚀
