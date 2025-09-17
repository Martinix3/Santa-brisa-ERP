#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="santa-brisa-erp"

echo "👉 Comprobando credenciales de gcloud application-default..."

CRED_FILE="$HOME/.config/gcloud/application_default_credentials.json"

if [[ ! -f "$CRED_FILE" ]]; then
  echo "⚠️  No se encontraron credenciales en $CRED_FILE"
  echo "🔑 Ejecutando gcloud auth application-default login..."
  gcloud auth application-default login
else
  echo "✅ Credenciales encontradas en $CRED_FILE"
fi

# Verifica que el proyecto esté correcto
gcloud config set project "$PROJECT_ID"

# Lee parámetros opcionales (puerto, host)
PORT=${1:-3000}
HOST=${2:-"0.0.0.0"}

echo "🚀 Arrancando app en modo dev (puerto=$PORT, host=$HOST)..."
npm run dev -- --port "$PORT" --hostname "$HOST"
