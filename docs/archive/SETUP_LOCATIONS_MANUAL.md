# 🏢 Setup Manual de Ubicaciones Canónicas

## Problema
Error: "Location not found: ALMACEN_PRINCIPAL"

## Solución: Crear ubicaciones en Firestore Console

### Opción 1: Firestore Console (Recomendado)

1. Ir a Firebase Console → Firestore Database
2. Crear colección `locations` (si no existe)
3. Crear los siguientes documentos:

#### Documento 1: ALMACEN_PRINCIPAL
```json
{
  "id": "ALMACEN_PRINCIPAL",
  "code": "MAIN",
  "name": "Almacén Principal",
  "type": "WAREHOUSE",
  "allowsStock": true,
  "requiresQc": false,
  "isActive": true,
  "createdAt": "2025-01-20T00:00:00.000Z",
  "updatedAt": "2025-01-20T00:00:00.000Z",
  "schemaVersion": 1
}
```

#### Documento 2: PRODUCCION
```json
{
  "id": "PRODUCCION",
  "code": "PROD",
  "name": "Producción",
  "type": "PRODUCTION",
  "allowsStock": true,
  "requiresQc": true,
  "isActive": true,
  "createdAt": "2025-01-20T00:00:00.000Z",
  "updatedAt": "2025-01-20T00:00:00.000Z",
  "schemaVersion": 1
}
```

#### Documento 3: CALIDAD
```json
{
  "id": "CALIDAD",
  "code": "QC",
  "name": "Control de Calidad",
  "type": "WAREHOUSE",
  "allowsStock": true,
  "requiresQc": false,
  "isActive": true,
  "createdAt": "2025-01-20T00:00:00.000Z",
  "updatedAt": "2025-01-20T00:00:00.000Z",
  "schemaVersion": 1
}
```

### Opción 2: Usar el endpoint API (Más fácil)

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre tu navegador y visita (o usa curl):
   ```bash
   curl -X POST http://localhost:3000/api/setup-locations
   ```

3. Verás una respuesta JSON confirmando las ubicaciones creadas:
   ```json
   {
     "success": true,
     "message": "Configuración completada: 3 creadas, 0 ya existían",
     "results": {
       "created": ["Almacén Principal", "Producción", "Control de Calidad"],
       "skipped": [],
       "errors": []
     }
   }
   ```

### Opción 3: Ejecutar script con credenciales

```bash
# 1. Configurar variable de entorno
export FIREBASE_PROJECT_ID="santa-brisa-erp"

# 2. Ejecutar script
npx tsx scripts/setup-canonical-locations.ts
```

## Verificación

Una vez creadas las ubicaciones, deberías poder:
1. ✅ Crear nuevas recepciones
2. ✅ Ver "ALMACEN_PRINCIPAL" en el selector de ubicaciones
3. ✅ El sistema funcionará correctamente

## Ubicaciones adicionales opcionales

Puedes crear más ubicaciones según tus necesidades:
- `ALMACEN_SECUNDARIO`
- `TIENDA_CENTRO`
- `TIENDA_SUR`
- `EN_TRANSITO`
- etc.

Usa el mismo formato JSON de arriba, cambiando `id`, `code` y `name`.
