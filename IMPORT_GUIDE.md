# 📊 Guía de Importación de Datos

## 🎯 Scripts Disponibles

### 1. **import-sales-targets.ts** (RECOMENDADO)
Importador específico para `Sales Targets ES - Cuentas.csv`

**Importa:**
- ✅ Cuentas (accounts)
- ✅ Parties (info contacto)
- ✅ Pedidos (ordersSellOut)
- ✅ Interacciones (interactions)
- ⚠️ Distribuidores: NULL (FASE 2)

**Uso:**
```bash
# Paso 1: Modo prueba (NO guarda nada)
ts-node scripts/import-sales-targets.ts --dry-run

# Paso 2: Si todo se ve bien, importar de verdad
ts-node scripts/import-sales-targets.ts
```

---

### 2. **import-data.ts** (GENÉRICO)
Importador genérico para cualquier Excel/CSV

**Uso:**
```bash
# Cuentas
ts-node scripts/import-data.ts --file "mi-archivo.xlsx" --type accounts --dry-run
ts-node scripts/import-data.ts --file "mi-archivo.xlsx" --type accounts

# Pedidos
ts-node scripts/import-data.ts --file "pedidos.csv" --type orders --dry-run
ts-node scripts/import-data.ts --file "pedidos.csv" --type orders

# Interacciones
ts-node scripts/import-data.ts --file "visitas.xlsx" --type interactions --dry-run
ts-node scripts/import-data.ts --file "visitas.xlsx" --type interactions
```

---

## 📋 FASE 1: Importar Sales Targets (AHORA)

### Prerequisitos
1. Archivo `Sales Targets ES - Cuentas.csv` en la raíz del proyecto ✅
2. Archivo `serviceAccountKey.json` configurado ✅
3. Dependencia `xlsx` instalada ✅

### Pasos

**1. Ejecutar en modo prueba:**
```bash
ts-node scripts/import-sales-targets.ts --dry-run
```

**Resultado esperado:**
```
🚀 Importando Sales Targets ES - Cuentas.csv...
📦 FASE 1: Sin distribuidores (se asignarán después)

📊 56 cuentas encontradas

📋 Vista previa (primeras 5):
  1. Chez Pepito (Madrid) - Alfonso - CLOSED / WON
  2. eMeBe (Madrid) - Nico - CLOSED / WON
  3. Morenas (Madrid) - Nico - CLOSED / WON
  ...

  ✓ Procesadas 10 cuentas...
  ✓ Procesadas 20 cuentas...
  ...

🔍 DRY RUN - No se guardó nada en la BD
   📋 56 cuentas serían importadas
   🛒 12 pedidos serían creados
   💬 45 interacciones serían registradas

⚠️  Distribuidores: NULL (asignar en FASE 2)
```

**2. Si todo se ve bien, ejecutar de verdad:**
```bash
ts-node scripts/import-sales-targets.ts
```

**3. Verificar en la app:**
- Ve a `/accounts` → Deberías ver las cuentas en pipeline
- Ve a `/orders` → Deberías ver los pedidos
- Ve a `/dashboard-ventas` → Métricas actualizadas

---

## 📋 FASE 2: Asignar Distribuidores (DESPUÉS)

### Opción A: CSV de Mapeo (RECOMENDADO)

**1. Crear archivo `distribuidores-mapping.csv`:**
```csv
Cuenta,Distribuidor
Chez Pepito,Escola Bellvitge
eMeBe,Mahou
Morenas,Escola Bellvitge
...
```

**2. Ejecutar script FASE 2:**
```bash
ts-node scripts/assign-distributors.ts --file distribuidores-mapping.csv --dry-run
ts-node scripts/assign-distributors.ts --file distribuidores-mapping.csv
```

### Opción B: Reglas Automáticas

```bash
ts-node scripts/assign-distributors.ts --auto-rules
```

Reglas:
- Madrid → Mahou
- Menorca → Escola Bellvitge  
- RETAIL → Agrupaprox
- etc.

---

## 🔧 Troubleshooting

### Error: "Cannot find module 'xlsx'"
```bash
npm install xlsx
```

### Error: "serviceAccountKey.json not found"
1. Descarga las credenciales de Firebase Console
2. Guárdalas como `serviceAccountKey.json` en la raíz
3. Añade a `.gitignore`:
```
serviceAccountKey.json
```

### Error: "Archivo no encontrado"
```bash
# Verifica que el archivo esté en la raíz
ls -la "Sales Targets ES - Cuentas.csv"
```

### Error: Duplicados
El script usa `batch.set()` que sobreescribe.
Para evitar duplicados, borra datos antes:
```bash
# TODO: Crear script cleanup
```

---

## 📊 Formato de Datos Esperado

### Sales Targets CSV
```
Columna B (1): Nombre cuenta ← OBLIGATORIO
Columna C (2): Nombre contacto
Columna D (3): Fecha
Columna F (5): Teléfono
Columna H (7): STATUS
Columna I (8): Area/Ciudad
Columna J (9): Comercial responsable
Columna L (11): Cajas vendidas
Columna M (12): Materiales entregados
Columna O (14): Dirección
```

### Genérico - Accounts
```csv
Nombre,CIF,Segmento,Stage,Ciudad,Email,Teléfono,Comercial,Distribuidor,Notas
Golf Escorpión,B12345678,HORECA,ACTIVA,Madrid,info@golf.com,912345678,Alfonso,Mahou,Cliente VIP
```

### Genérico - Orders
```csv
Cliente,Fecha,Total,Estado,Flow,Canal
Golf Escorpión,2025-01-15,508,open,DIRECT,HORECA
```

### Genérico - Interactions
```csv
Cliente,Tipo,Fecha,Nota,Comercial
Golf Escorpión,VISITA,2025-01-10,Entrega material PLV,Alfonso
```

---

## ✅ Checklist Post-Importación

- [ ] Verificar cuentas en `/accounts`
- [ ] Verificar vista Pipeline funciona
- [ ] Verificar pedidos en `/orders`
- [ ] Verificar métricas en dashboards
- [ ] FASE 2: Asignar distribuidores
- [ ] Verificar alertas funcionan
- [ ] Backup de Firestore (recomendado)

---

## 🚀 Próximos Scripts a Crear

- [ ] `assign-distributors.ts` (FASE 2)
- [ ] `cleanup-data.ts` (borrar todo para reimportar)
- [ ] `validate-data.ts` (validar integridad)
- [ ] `export-to-excel.ts` (exportar desde Firestore)
