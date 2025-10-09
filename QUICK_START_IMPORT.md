# 🚀 Guía Rápida de Importación

## ✅ Scripts Creados

1. **`cleanup-firestore.ts`** → Borra datos de prueba
2. **`import-from-csvs.ts`** → Importa tus CSVs

---

## 📋 PASO A PASO

### **1. Ver qué se borraría (seguro)**
```bash
ts-node scripts/cleanup-firestore.ts --dry-run
```

### **2. Borrar datos de prueba**
```bash
ts-node scripts/cleanup-firestore.ts --confirm
```

### **3. Ver qué se importaría (seguro)**
```bash
ts-node scripts/import-from-csvs.ts --dry-run
```

### **4. Importar de verdad**
```bash
ts-node scripts/import-from-csvs.ts
```

### **5. Verificar en la app**
- Ve a `/accounts` → Deberías ver tus cuentas
- Ve a `/orders` → Deberías ver los pedidos
- Ve a `/dashboard-ventas` → Deberías ver métricas

---

## 📊 Tus CSVs

Los scripts buscan estos archivos en la raíz:

✅ `users-buena.csv` → Comerciales
✅ `party-buena.csv` → Info contacto
✅ `accouts-buena.csv` → Cuentas/clientes
✅ `orders-buena.csv` → Pedidos

**¡Ya los tienes todos!**

---

## 🎯 Orden de Ejecución Completa

```bash
# Paso 1: Verificar qué se borrará
ts-node scripts/cleanup-firestore.ts --dry-run

# Paso 2: Borrar (si todo OK)
ts-node scripts/cleanup-firestore.ts --confirm

# Paso 3: Verificar qué se importará
ts-node scripts/import-from-csvs.ts --dry-run

# Paso 4: Importar (si todo OK)
ts-node scripts/import-from-csvs.ts

# ✅ Listo!
```

---

## ⚠️ Troubleshooting

### Error: "serviceAccountKey.json not found"
1. Descarga desde Firebase Console
2. Guarda como `serviceAccountKey.json` en raíz
3. Añade a `.gitignore`

### Error: "Cannot find module 'xlsx'"
```bash
npm install xlsx
```

### Error: archivo CSV no encontrado
Verifica que los CSVs estén en la raíz:
```bash
ls -la *.csv
```

---

## 📈 Resultado Esperado

**Después de importar verás:**
- ~150 cuentas en `/accounts`
- ~70 pedidos en `/orders`
- Dashboard con métricas actualizadas
- Pipeline con cuentas por stage

---

## 🔄 Para Volver a Importar

Si necesitas reimportar todo:
```bash
# 1. Borrar todo
ts-node scripts/cleanup-firestore.ts --confirm

# 2. Importar de nuevo
ts-node scripts/import-from-csvs.ts
```

---

## 🆘 Ayuda

Para ver opciones de cada script:
```bash
ts-node scripts/cleanup-firestore.ts --help
ts-node scripts/import-from-csvs.ts --help
```

---

**¡Listo para empezar! 🎉**

Ejecuta el primer comando:
```bash
ts-node scripts/cleanup-firestore.ts --dry-run
