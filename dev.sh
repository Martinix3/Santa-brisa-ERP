#!/usr/bin/env bash
set -euo pipefail

echo "🛑 Matando dev servers viejos..."
pkill -f "next dev" || true
pkill -f "node .*next" || true

echo "🧹 Limpiando artefactos de compilación y cachés..."
rm -rf .next .turbo node_modules/.cache dist build coverage

echo "🧽 Limpiando caché de NPM de forma segura..."
npm cache clean --force

echo "🔒 Normalizando lockfiles: usar npm"
rm -f pnpm-lock.yaml yarn.lock

echo "📦 Instalando dependencias (sin opcionales, menos espacio)..."
npm install --no-optional --legacy-peer-deps

echo "🚀 Arrancando Next en 0.0.0.0:3000 ..."
HOST=0.0.0.0 PORT=3000 npm run dev
