#!/bin/bash
# Script para probar el webhook de Holded estimate

echo "🧪 Probando webhook de Holded Estimate..."
echo ""

# Asegurarse de que el servidor esté corriendo
echo "⚠️  Asegúrate de tener el servidor corriendo en otra terminal:"
echo "   npm run dev"
echo ""
echo "Presiona Enter para continuar..."
read

echo "📤 Enviando webhook de prueba..."
echo ""

curl -X POST http://localhost:3000/api/integrations/holded/webhooks/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "event": "estimate.created",
    "data": {
      "id": "est_test_'$(date +%s)'",
      "contactId": "5a9d9a7d20fa3218f1c4e4c0",
      "date": "2025-01-09",
      "items": [
        {
          "sku": "SB-KOMBUCHA-350",
          "name": "Kombucha Original 350ml",
          "units": 24,
          "price": 2.5,
          "tax": 21
        },
        {
          "sku": "SB-GINGER-350",
          "name": "Kombucha Jengibre 350ml",
          "units": 12,
          "price": 2.5,
          "tax": 21
        }
      ],
      "total": 90,
      "notes": "Pedido de prueba desde script"
    }
  }'

echo ""
echo ""
echo "✅ Webhook enviado!"
echo ""
echo "🔍 Verifica en Firebase Console:"
echo "   1. Parties → Busca party con holdedContactId"
echo "   2. Accounts → Busca account vinculada"
echo "   3. OrdersSellOut → Busca order con flow=DIRECT"
echo ""
echo "📊 O ve a tu app:"
echo "   http://localhost:3000/sell-out"
echo ""
