# 🔧 Correção Rápida - Erro no Plesk

## ❌ Problema Identificado

Você está recebendo estes erros:

1. **Erro Apache:** `Option FollowSymLinks not allowed here`
2. **Erro 404:** Página não carrega

## ✅ Solução Rápida (5 minutos)

### Passo 1: Corrigir Estrutura de Pastas

Atualmente seus arquivos estão em:
```
/var/www/vhosts/apexpay.duckdns.org/httpdocs/public_html/
```

Precisam estar em:
```
/var/www/vhosts/apexpay.duckdns.org/httpdocs/
```

**Via SSH:**

```bash
# Conectar ao servidor
ssh usuario@apexpay.duckdns.org

# Ir para httpdocs
cd /var/www/vhosts/apexpay.duckdns.org/httpdocs/

# Mover arquivos para raiz
mv public_html/* .
mv public_html/.htaccess .

# Remover pasta vazia
rmdir public_html

# Verificar
ls -la
```

Você deve ver:
```
httpdocs/
├── index.html
├── assets/
├── .htaccess
└── api/
```

### Passo 2: Atualizar .htaccess Principal

Edite o arquivo `.htaccess` na raiz:

```bash
nano .htaccess
```

Substitua o conteúdo por:

```apache
RewriteEngine On

# Security Headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"

# Disable directory listing (SEM FollowSymLinks para Plesk)
Options -Indexes

# Prevent access to sensitive files
<FilesMatch "\.(env|log|sql|md)$">
    Require all denied
</FilesMatch>

# API Routes
RewriteCond %{REQUEST_URI} ^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# Frontend React SPA
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/json "access plus 1 week"
</IfModule>
```

**Mudanças importantes:**
- ❌ Removido `+FollowSymLinks` (linha 10)
- ✅ Mudado `Order allow,deny / Deny from all` para `Require all denied`

### Passo 3: Atualizar .htaccess da API

Edite o arquivo `api/.htaccess`:

```bash
nano api/.htaccess
```

Conteúdo:

```apache
RewriteEngine On

# Handle API routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Security Headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"

# Disable directory listing
Options -Indexes

# Prevent access to sensitive files
<FilesMatch "\.(env|log|sql)$">
    Require all denied
</FilesMatch>
```

### Passo 4: Configurar Permissões

```bash
chmod 644 .htaccess
chmod 644 index.html
chmod 755 api/
chmod 644 api/.htaccess
chmod 775 api/storage -R
```

### Passo 5: Verificar DocumentRoot no Plesk

1. Acesse o **Painel Plesk**
2. Vá em: **Websites & Domains** → **apexpay.duckdns.org**
3. Clique em: **Hosting Settings** ou **Apache & nginx Settings**
4. Verifique o **Document root:** deve ser `/httpdocs`
5. Se estiver diferente, mude para `/httpdocs`
6. **Salve** as mudanças

### Passo 6: Testar

```bash
# Via SSH, testar se o HTML está correto
curl -L https://apexpay.duckdns.org/

# Deve retornar o HTML do React
```

No navegador:
- Acesse: `https://apexpay.duckdns.org/`
- Deve carregar a **página de login**

---

## 🎯 Comandos Rápidos (Copy/Paste)

Se quiser executar tudo de uma vez:

```bash
# 1. Ir para httpdocs
cd /var/www/vhosts/apexpay.duckdns.org/httpdocs/

# 2. Mover arquivos
mv public_html/* . 2>/dev/null
mv public_html/.htaccess . 2>/dev/null
rmdir public_html 2>/dev/null

# 3. Atualizar .htaccess principal
cat > .htaccess << 'HTACCESS'
RewriteEngine On
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Options -Indexes
<FilesMatch "\.(env|log|sql|md)$">
    Require all denied
</FilesMatch>
RewriteCond %{REQUEST_URI} ^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php [QSA,L]
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
HTACCESS

# 4. Atualizar .htaccess da API
cat > api/.htaccess << 'HTACCESS'
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Options -Indexes
<FilesMatch "\.(env|log|sql)$">
    Require all denied
</FilesMatch>
HTACCESS

# 5. Proteger storage
echo "Require all denied" > api/storage/.htaccess

# 6. Configurar permissões
chmod 644 .htaccess index.html
chmod 755 api/
chmod 644 api/.htaccess
chmod 775 api/storage -R

# 7. Verificar estrutura
echo "=== Estrutura atual ==="
ls -la

echo ""
echo "=== Testando site ==="
curl -I https://apexpay.duckdns.org/
```

---

## 🔍 O Que Foi Corrigido

### Problema 1: FollowSymLinks
**Antes:**
```apache
Options -Indexes +FollowSymLinks
```

**Depois:**
```apache
Options -Indexes
```

**Por quê?** Plesk não permite `FollowSymLinks` por padrão por segurança.

### Problema 2: Sintaxe Apache Antiga
**Antes:**
```apache
Order allow,deny
Deny from all
```

**Depois:**
```apache
Require all denied
```

**Por quê?** Apache 2.4+ usa nova sintaxe de controle de acesso.

### Problema 3: Estrutura de Pastas
**Antes:**
```
httpdocs/
  └── public_html/
      ├── index.html
      └── api/
```

**Depois:**
```
httpdocs/
  ├── index.html
  └── api/
```

**Por quê?** DocumentRoot aponta para `httpdocs/`, não `httpdocs/public_html/`.

---

## 🆘 Ainda Não Funciona?

### Erro: "403 Forbidden"
**Causa:** Permissões incorretas

**Solução:**
```bash
cd /var/www/vhosts/apexpay.duckdns.org/httpdocs/
chmod 644 index.html
chmod 755 .
```

### Erro: "500 Internal Server Error"
**Causa:** Erro no .htaccess

**Solução:**
```bash
# Ver logs do Apache
tail -n 50 /var/www/vhosts/apexpay.duckdns.org/logs/error_log
```

Se mostrar erro de sintaxe no .htaccess, verifique se copiou corretamente.

### Erro: API retorna 404
**Causa:** Rewrite não está funcionando

**Solução:**
```bash
# Verificar se mod_rewrite está ativo
apache2ctl -M | grep rewrite
```

Se não estiver, entre em contato com suporte do Plesk.

### Erro: CORS no navegador
**Causa:** Backend não está respondendo ou domínio errado no .env

**Solução:**
```bash
nano api/.env
# Verificar:
APP_URL=https://apexpay.duckdns.org
CORS_ALLOWED_ORIGINS=https://apexpay.duckdns.org
```

---

## ✅ Checklist Final

Após executar as correções:

- [ ] Arquivos estão em `httpdocs/` (não em `httpdocs/public_html/`)
- [ ] `.htaccess` NÃO contém `+FollowSymLinks`
- [ ] `.htaccess` usa `Require all denied` (não `Deny from all`)
- [ ] DocumentRoot no Plesk aponta para `/httpdocs`
- [ ] Permissões configuradas corretamente
- [ ] Site carrega no navegador
- [ ] API responde em `/api/auth/login`

---

## 🎉 Pronto!

Agora o site deve funcionar corretamente no Plesk.

**URLs funcionais:**
- ✅ `https://apexpay.duckdns.org/` - Login
- ✅ `https://apexpay.duckdns.org/admin` - Painel Admin
- ✅ `https://apexpay.duckdns.org/api/auth/login` - API

Se ainda tiver problemas, verifique os logs:
```bash
tail -f /var/www/vhosts/apexpay.duckdns.org/logs/error_log
```

**Tempo estimado:** 5-10 minutos para implementar todas as correções.
