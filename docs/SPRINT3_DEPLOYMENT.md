# Sprint 3: Integración Agenda/Visitas - Guía de Deployment

## ✅ Implementación Completa

Sprint 3 implementado al 100% con:
- ✅ UI para planificar visitas desde tareas
- ✅ Vinculación automática tarea ↔ evento
- ✅ Cloud Function para auto-generación de tareas

---

## 📦 Archivos Creados

### **Frontend (UI)**
```
src/features/tasks/
├── components/
│   └── VisitPlannerDialog.tsx     ← Dialog planificar visita
├── actions.ts                      ← Action createEventFromTask
└── components/
    └── TaskDrawer.tsx              ← Botón + integración
```

### **Backend (Cloud Functions)**
```
functions/
├── src/
│   ├── index.ts                           ← Export de functions
│   ├── firebase-admin.ts                  ← Setup Firebase Admin
│   ├── utils/
│   │   └── dateHelpers.ts                 ← Helpers de fecha
│   └── automation/
│       └── checkInactiveAccounts.ts       ← Cloud Function principal
└── package.json                            ← Dependencias (ver abajo)
```

---

## 🚀 Deployment

### **1. Setup Inicial de Functions**

Si no existe el directorio functions:

```bash
# Desde la raíz del proyecto
firebase init functions

# Seleccionar:
# - TypeScript
# - ESLint yes
# - Install dependencies yes
```

### **2. Instalar Dependencias**

```bash
cd functions
npm install firebase-admin firebase-functions
npm install --save-dev @types/node typescript
```

### **3. Configurar package.json**

Verificar que `functions/package.json` tenga:

```json
{
  "name": "functions",
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### **4. Configurar tsconfig.json**

Verificar que `functions/tsconfig.json` tenga:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017",
    "esModuleInterop": true
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
```

### **5. Build y Deploy**

```bash
# Desde /functions
npm run build

# Deploy solo functions
firebase deploy --only functions

# O deploy función específica
firebase deploy --only functions:checkInactiveAccounts
```

---

## ⚙️ Configuración

### **Variables del Sistema**

La Cloud Function lee los thresholds desde `/admin/variables`:

```
/admin/variables → SystemConfig → businessRules.alerts
  ├─ daysWithoutOrder: 45          (días sin pedido → alerta)
  ├─ daysWithoutVisit: 30          (días sin visita → alerta)
  └─ daysSinPedidoCritical: 60     (días sin pedido → crítico)
```

Puedes ajustar estos valores desde la UI de admin sin re-deployar la función.

### **Horario de Ejecución**

Por defecto: **Diario a las 9 AM (Europe/Madrid)**

Para cambiar:
```typescript
// functions/src/automation/checkInactiveAccounts.ts
schedule: "0 9 * * *"  // Cron expression
```

Ejemplos:
- `0 8 * * *` → 8 AM diario
- `0 9 * * 1` → 9 AM solo lunes
- `0 */6 * * *` → Cada 6 horas

### **Memoria Asignada**

Por defecto: **512MB**

Para cambiar:
```typescript
memory: "512MiB"  // Opciones: 256MiB, 512MiB, 1GiB, 2GiB
```

---

## 📊 Monitoreo

### **Ver Logs en Tiempo Real**

```bash
# Todos los logs
firebase functions:log

# Solo checkInactiveAccounts
firebase functions:log --only checkInactiveAccounts

# Logs en tiempo real (follow)
firebase functions:log --only checkInactiveAccounts --stream
```

### **Logs en Firebase Console**

1. Ir a Firebase Console → Functions
2. Click en `checkInactiveAccounts`
3. Ver logs, métricas, ejecuciones

### **Métricas a Monitorear**

```
📈 Métricas Clave:
  - Cuentas revisadas: ~X por ejecución
  - Tareas creadas: Variable según inactividad
  - Tareas actualizadas: Actualizaciones de existentes
  - Tiempo ejecución: <30s normal, >60s revisar
  - Errores: 0 esperado
```

---

## 🧪 Testing

### **Test Manual con Emulators**

```bash
cd functions
npm run serve

# En otra terminal
firebase functions:shell

# Ejecutar función manualmente
> checkInactiveAccounts()
```

### **Test en Producción (Trigger Manual)**

```bash
# Trigger inmediato (no esperar cron)
gcloud scheduler jobs run checkInactiveAccounts \
  --location=europe-west1
```

### **Verificar Resultados**

```bash
# Ver tareas creadas hoy
firebase firestore:get tasks \
  --where "source==AUTO_RULE" \
  --where "createdAt>=$(date -u +%Y-%m-%dT00:00:00Z)"
```

---

## 🔍 Troubleshooting

### **Error: "Permission denied"**

```bash
# Verificar permisos del service account
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Añadir rol si falta
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/datastore.user"
```

### **Error: "Function deployment failed"**

```bash
# Limpiar y rebuild
cd functions
rm -rf node_modules lib
npm install
npm run build
firebase deploy --only functions
```

### **Error: "Missing index"**

Si ves error de índice faltante:

```bash
# Deploy índices
firebase deploy --only firestore:indexes

# O crear índice específico desde logs error
```

### **La función no se ejecuta**

```bash
# Verificar scheduler existe
gcloud scheduler jobs list --location=europe-west1

# Ver próxima ejecución
gcloud scheduler jobs describe checkInactiveAccounts \
  --location=europe-west1
```

---

## 📈 Optimizaciones

### **Reducir Queries (Costo)**

Si tienes muchas cuentas (>1000):

```typescript
// Paginar accounts
const accountsSnap = await db
  .collection("contacts")
  .where("roles", "array-contains", "CUSTOMER")
  .where("customer.lastOrderDate", "<", oldDate) // Pre-filtrar
  .limit(100)
  .get();
```

### **Batch Writes**

Para muchas tareas simultáneas:

```typescript
const batch = db.batch();
// ... añadir operaciones
await batch.commit();
```

### **Caché de Config**

```typescript
// Cachear config 5 min
let cachedConfig: any = null;
let cacheTime = 0;

if (Date.now() - cacheTime > 300000) {
  cachedConfig = await getSystemConfig();
  cacheTime = Date.now();
}
```

---

## 🎯 Casos de Uso

### **Caso 1: Cliente sin pedido hace 50 días**

```
Día 50 a las 9 AM:
  → Cloud Function ejecuta
  → Detecta: daysSinceOrder = 50 >= 45
  → Crea tarea:
    - Title: "Visitar: Restaurante ABC (50d sin pedido)"
    - Priority: MEDIUM
    - DueAt: +2 días
    - Assigned: Owner de la cuenta
```

### **Caso 2: Cliente sin visita hace 35 días**

```
Día 35 a las 9 AM:
  → Detecta: daysSinceVisit = 35 >= 30
  → Crea tarea:
    - Title: "Contactar: Bar XYZ (35d sin visita)"
    - Priority: MEDIUM
    - DueAt: +3 días
```

### **Caso 3: Cliente crítico (65 días sin pedido)**

```
Día 65 a las 9 AM:
  → Detecta: daysSinceOrder = 65 >= 60 (crítico)
  → Crea tarea:
    - Priority: HIGH (⚠️ escalado)
    - DueAt: +2 días
```

### **Caso 4: Deduplicación Semanal**

```
Lunes semana 42:
  → Crea tarea con dedupeKey: "no-order-acc123-week-42"

Martes semana 42:
  → Encuentra tarea existente
  → ACTUALIZA en lugar de duplicar
  → Title actualizado con nuevos días

Lunes semana 43:
  → Nuevo dedupeKey: "week-43"
  → Crea nueva tarea (si sigue sin pedido)
```

---

## 📋 Checklist Post-Deployment

- [ ] Cloud Function deployed exitosamente
- [ ] Scheduler creado automáticamente (por onSchedule)
- [ ] Primera ejecución manual exitosa
- [ ] Logs muestran cuentas revisadas
- [ ] SystemConfig accesible desde /admin/variables
- [ ] Tareas AUTO_RULE aparecen en dashboard
- [ ] Emails/notificaciones a owners (si configurado)

---

## 🔗 Referencias

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Cron](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)
- [Firestore Query Limits](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)

---

## 🎉 Sprint 3 Completado

**Features Implementadas:**
- ✅ UI planificar visitas desde tareas
- ✅ Vinculación automática tarea ↔ evento  
- ✅ Cloud Function cuentas inactivas
- ✅ Deduplicación semanal inteligente
- ✅ Thresholds configurables desde UI
- ✅ Prioridad automática según criticidad
- ✅ Logs y monitoreo completo

**Próximo Sprint:** Sprint 4 - Seguridad y Rendimiento
