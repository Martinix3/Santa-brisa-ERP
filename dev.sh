#!/usr/bin/env bash
set -euo pipefail

echo "🛑 Matando dev servers viejos..."
pkill -f "next dev" || true
pkill -f "node .*next" || true

echo "🧹 Limpiando artefactos de compilación y cachés..."
rm -rf .next .turbo node_modules/.cache dist build coverage

echo "🧽 Limpiando cachés de usuario (si existen)..."
rm -rf "$HOME/.npm/_cacache" "$HOME/.npm/_logs" "$HOME/.cache" "$HOME/.pnpm-store" "$HOME/.local/share/pnpm/store" 2>/dev/null || true

echo "🔒 Normalizando lockfiles: usar npm"
rm -f pnpm-lock.yaml yarn.lock

echo "📦 Instalando dependencias (sin opcionales, menos espacio)..."
npm install --no-optional --legacy-peer-deps

echo "🚀 Arrancando Next en 0.0.0.0:3000 ..."
HOST=0.0.0.0 PORT=3000 npm run dev
