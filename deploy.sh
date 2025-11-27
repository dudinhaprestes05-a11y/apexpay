#!/bin/bash

# Apex Payment Gateway - Deploy Script
# Compila o frontend e copia para a raiz

set -e

echo "========================================="
echo "  🚀 Deploy Apex Payment Gateway"
echo "========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar se estamos na raiz do projeto
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Erro: Execute este script da raiz do projeto"
    exit 1
fi

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production=false

# 2. Remover apenas assets compilados (mantém index.html fonte)
echo ""
echo "🗑️  Removendo assets antigos..."
rm -rf "$PROJECT_ROOT/assets"

# 3. Build do frontend
echo ""
echo "🔨 Compilando frontend..."
npm run build

# 4. Verificar se o build foi criado
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "❌ Erro: Build falhou - pasta dist/ não encontrada"
    exit 1
fi

# 5. Copiar novos arquivos para raiz
echo "📋 Copiando arquivos compilados..."
cp -f "$PROJECT_ROOT/dist/index.html" "$PROJECT_ROOT/"
cp -r "$PROJECT_ROOT/dist/assets" "$PROJECT_ROOT/"

# 6. Ajustar permissões (se executado como root)
if [ "$EUID" -eq 0 ]; then
    echo "🔐 Ajustando permissões..."
    chown -R www-data:www-data "$PROJECT_ROOT/index.html" "$PROJECT_ROOT/assets" 2>/dev/null || true
    chmod 644 "$PROJECT_ROOT/index.html"
    find "$PROJECT_ROOT/assets" -type f -exec chmod 644 {} \;
    find "$PROJECT_ROOT/assets" -type d -exec chmod 755 {} \;
fi

# 7. Verificar estrutura final
echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📁 Estrutura na raiz:"
echo "   ├── index.html    (SPA)"
echo "   ├── assets/       (CSS/JS)"
echo "   ├── api/          (Backend PHP)"
echo "   └── .htaccess     (Routing)"
echo ""
echo "🌐 Acesse: https://apexpay.duckdns.org/"
echo ""
