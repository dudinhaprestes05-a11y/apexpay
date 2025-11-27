#!/bin/bash

# Apex Payment Gateway - Deploy Script
# Compila o frontend e copia para a raiz do servidor

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

# Backup do .env se existir
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "💾 Fazendo backup do .env..."
    cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.backup"
fi

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production=false

# 2. Limpar build anterior
echo ""
echo "🗑️  Limpando build anterior..."
rm -rf "$PROJECT_ROOT/dist"

# 3. Build do frontend
echo ""
echo "🔨 Compilando frontend..."
npm run build

# 4. Verificar se o build foi criado
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "❌ Erro: Build falhou - pasta dist/ não encontrada"
    exit 1
fi

# 5. Backup dos arquivos atuais na raiz (se existirem)
echo ""
echo "💾 Fazendo backup dos arquivos atuais..."
if [ -f "$PROJECT_ROOT/index.html" ] && [ ! -L "$PROJECT_ROOT/index.html" ]; then
    mv "$PROJECT_ROOT/index.html" "$PROJECT_ROOT/index.html.old" 2>/dev/null || true
fi
if [ -d "$PROJECT_ROOT/assets" ] && [ ! -L "$PROJECT_ROOT/assets" ]; then
    mv "$PROJECT_ROOT/assets" "$PROJECT_ROOT/assets.old" 2>/dev/null || true
fi

# 6. Copiar arquivos compilados para raiz
echo "📋 Copiando arquivos compilados para raiz..."
cp "$PROJECT_ROOT/dist/index.html" "$PROJECT_ROOT/"
cp -r "$PROJECT_ROOT/dist/assets" "$PROJECT_ROOT/"

# 7. Restaurar .env se foi feito backup
if [ -f "$PROJECT_ROOT/.env.backup" ]; then
    echo "♻️  Restaurando .env..."
    cp "$PROJECT_ROOT/.env.backup" "$PROJECT_ROOT/.env"
    rm "$PROJECT_ROOT/.env.backup"
fi

# 8. Ajustar permissões (se executado como root ou sudo)
if [ "$EUID" -eq 0 ]; then
    echo ""
    echo "🔐 Ajustando permissões..."
    chown -R www-data:www-data "$PROJECT_ROOT/index.html" "$PROJECT_ROOT/assets" 2>/dev/null || true
    chmod 644 "$PROJECT_ROOT/index.html"
    find "$PROJECT_ROOT/assets" -type f -exec chmod 644 {} \;
    find "$PROJECT_ROOT/assets" -type d -exec chmod 755 {} \;
fi

# 9. Limpar backups antigos
echo ""
echo "🧹 Limpando backups antigos..."
rm -rf "$PROJECT_ROOT/index.html.old" "$PROJECT_ROOT/assets.old" 2>/dev/null || true

# 10. Verificar estrutura final
echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📁 Estrutura na raiz:"
echo "   ├── index.html    (SPA compilado)"
echo "   ├── assets/       (CSS/JS compilados)"
echo "   ├── api/          (Backend PHP)"
echo "   ├── .htaccess     (Routing Apache)"
echo "   └── .env          (Configurações)"
echo ""
echo "⚠️  IMPORTANTE: Não esqueça de configurar o .env com suas credenciais!"
echo ""
echo "🌐 URL: https://apexpay.duckdns.org/"
echo ""
