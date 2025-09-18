#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="santa-brisa-erp"
CRED_FILE="$HOME/.config/gcloud/application_default_credentials.json"

echo "👉 Verificando credenciales de gcloud application-default..."

# Función para solicitar la autenticación
function do_login() {
  echo "🔑 Las credenciales no son válidas o han caducado. Ejecutando 'gcloud auth application-default login'..."
  echo "Por favor, sigue las instrucciones en el navegador para autenticarte."
  gcloud auth application-default login
  if [[ $? -ne 0 ]]; then
    echo "❌ La autenticación ha fallado. Por favor, inténtalo de nuevo."
    exit 1
  fi
  echo "✅ Credenciales renovadas con éxito."
}

# Comprueba si el fichero de credenciales existe
if [[ ! -f "$CRED_FILE" ]]; then
  echo "⚠️ No se encontraron credenciales en $CRED_FILE."
  do_login
else
  # Comprueba si las credenciales han caducado (buscando la fecha de expiración)
  # Esto es una heurística; gcloud no expone un comando simple para esto.
  # Si el token falla, la forma más robusta es re-loguear.
  echo "✅ Credenciales encontradas. Si la app falla con error de autenticación, borra el fichero y re-ejecuta este script:"
  echo "rm $CRED_FILE"
fi

# Intenta obtener un token de acceso. Si falla, fuerza el login.
echo "🔄 Intentando obtener un token de acceso para validar las credenciales..."
if ! gcloud auth application-default print-access-token --project="$PROJECT_ID" > /dev/null 2>&1; then
    echo "⚠️ No se pudo obtener un token de acceso. Las credenciales podrían haber caducado."
    do_login
else
    echo "✅ El token de acceso se ha obtenido correctamente. Las credenciales parecen válidas."
fi

# Verifica que el proyecto esté correcto
echo "🔧 Estableciendo proyecto gcloud a '$PROJECT_ID'..."
gcloud config set project "$PROJECT_ID"

# Lee parámetros opcionales (puerto, host)
PORT=${1:-3000}
HOST=${2:-"0.0.0.0"}

echo "🚀 Arrancando la aplicación en modo desarrollo (puerto=$PORT, host=$HOST)..."
npm run dev -- --port "$PORT" --hostname "$HOST"
