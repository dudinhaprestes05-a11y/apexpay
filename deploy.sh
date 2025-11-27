#!/bin/bash

echo "======================================"
echo "  Apex Payment Gateway - Deploy Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if public_html exists
if [ -d "public_html" ]; then
    echo -e "${YELLOW}⚠️  public_html já existe. Deseja recriar? (s/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([sS][iI][mM]|[sS])$ ]]; then
        rm -rf public_html
        echo -e "${GREEN}✓ public_html removido${NC}"
    else
        echo -e "${RED}✗ Cancelado${NC}"
        exit 1
    fi
fi

echo ""
echo "Passo 1: Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build concluído${NC}"
else
    echo -e "${RED}✗ Erro no build${NC}"
    exit 1
fi

echo ""
echo "Passo 2: Criando estrutura public_html..."
mkdir -p public_html/api/storage/{uploads,logs}

echo ""
echo "Passo 3: Copiando arquivos do frontend..."
cp -r dist/* public_html/
echo -e "${GREEN}✓ Frontend copiado${NC}"

echo ""
echo "Passo 4: Copiando arquivos do backend..."
cp -r backend/public/* public_html/api/
cp -r backend/{core,controllers,models,services,middleware,config,database} public_html/api/
cp backend/.env public_html/api/.env
echo -e "${GREEN}✓ Backend copiado${NC}"

echo ""
echo "Passo 5: Criando .htaccess..."

# .htaccess principal
cat > public_html/.htaccess << 'EOF'
RewriteEngine On

# Security Headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"

# Disable directory listing
Options -Indexes +FollowSymLinks

# Prevent access to sensitive files
<FilesMatch "\.(env|log|sql|md)$">
    Order allow,deny
    Deny from all
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
EOF

# .htaccess da API
cat > public_html/api/.htaccess << 'EOF'
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
    Order allow,deny
    Deny from all
</FilesMatch>
EOF

# Proteger storage
echo "Deny from all" > public_html/api/storage/.htaccess

echo -e "${GREEN}✓ .htaccess criados${NC}"

echo ""
echo "Passo 6: Configurando permissões..."
chmod 775 public_html/api/storage -R
echo -e "${GREEN}✓ Permissões configuradas${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}✓ Deploy preparado com sucesso!${NC}"
echo "======================================"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Edite o arquivo: ${YELLOW}public_html/api/.env${NC}"
echo "   - Configure as credenciais do banco de dados"
echo "   - Mude JWT_SECRET para um valor seguro"
echo "   - Configure APP_URL com seu domínio"
echo ""
echo "2. Faça upload da pasta ${YELLOW}public_html/${NC} para seu servidor"
echo ""
echo "3. No servidor, execute:"
echo "   ${YELLOW}cd api && php migrate.php${NC}"
echo "   ${YELLOW}php create-admin.php admin@email.com senha123${NC}"
echo ""
echo "Consulte ${YELLOW}DEPLOY.md${NC} para instruções detalhadas."
echo ""
