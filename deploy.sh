#!/bin/bash

# Apex Payment Gateway - Deploy Script
# Compila o frontend e copia para httpdocs/

set -e

echo "========================================="
echo "  🚀 Deploy Apex Payment Gateway"
echo "========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTTPDOCS="$PROJECT_ROOT/httpdocs"

# Verificar se estamos na raiz do projeto
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Erro: Execute este script da raiz do projeto"
    exit 1
fi

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production=false

# 2. Build do frontend
echo ""
echo "🔨 Compilando frontend..."
npm run build

# 3. Verificar se o build foi criado
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "❌ Erro: Build falhou - pasta dist/ não encontrada"
    exit 1
fi

# 4. Criar pasta httpdocs se não existir
mkdir -p "$HTTPDOCS"

# 5. Remover arquivos antigos
echo ""
echo "🗑️  Removendo arquivos antigos..."
rm -f "$HTTPDOCS/index.html"
rm -rf "$HTTPDOCS/assets"

# 6. Copiar novos arquivos
echo "📋 Copiando arquivos compilados..."
cp "$PROJECT_ROOT/dist/index.html" "$HTTPDOCS/"
cp -r "$PROJECT_ROOT/dist/assets" "$HTTPDOCS/"

# 7. Ajustar permissões (se executado como root)
if [ "$EUID" -eq 0 ]; then
    echo "🔐 Ajustando permissões..."
    chown -R www-data:www-data "$HTTPDOCS/index.html" "$HTTPDOCS/assets" 2>/dev/null || true
    chmod 644 "$HTTPDOCS/index.html"
    find "$HTTPDOCS/assets" -type f -exec chmod 644 {} \;
    find "$HTTPDOCS/assets" -type d -exec chmod 755 {} \;
fi

# 8. Verificar estrutura final
echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📁 Estrutura:"
echo "   httpdocs/"
echo "   ├── index.html"
echo "   ├── assets/"
echo "   └── api/"
echo ""
echo "🌐 Acesse: https://apexpay.duckdns.org/"
echo ""
