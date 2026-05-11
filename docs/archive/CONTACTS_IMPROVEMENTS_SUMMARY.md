# Mejoras Implementadas en /contacts

## ✅ Completado

### 1. Detección de Duplicados en 3 Colecciones
- Busca en `parties`, `customers` y `suppliers`
- Algoritmo Levenshtein con múltiples criterios
- UI con identificación de colección origen

### 2. Funcionalidad de Edición Masiva
**Action creada:** `bulkUpdateContacts()`
- Permite cambiar: segment, city, originType
- Batch updates en Firestore
- Maneja las 3 colecciones

### 3. Pendiente: UI Completa
Para completar la funcionalidad, necesitas añadir a `/contacts/page.tsx`:

#### Checkboxes en la Tabla
```tsx
// En la columna de checkbox (ya existe estructura base)
<td className="p-3">
  <input
    type="checkbox"
    checked={selected.includes(r.id)}
    onChange={() => toggleSelect(r.id)}
    onClick={(e) => e.stopPropagation()} // Evitar abrir drawer
    className="rounded"
  />
</td>
```

#### Dialog de Edición Masiva
```tsx
{bulkEditOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="relative bg-background/70 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border/50 ring-1 ring-black/5">
      <h2 className="text-lg font-semibold mb-4">Edición Masiva</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Editando {selected.length} contactos
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Segmento</label>
          <select className="w-full px-3 py-2 rounded-lg border">
            <option value="">Sin cambios</option>
            <option value="HORECA">HORECA</option>
            <option value="RETAIL">RETAIL</option>
            <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
            <option value="PRIVADA">PRIVADA</option>
            <option value="ONLINE">ONLINE</option>
          </select>
        </div>
        
        <div>
          <label className="text-xs text-muted-foreground">Ciudad</label>
          <input 
            type="text" 
            placeholder="Nueva ciudad (opcional)"
            className="w-full px-3 py-2 rounded-lg border"
          />
        </div>
        
        <div>
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select className="w-full px-3 py-2 rounded-lg border">
            <option value="">Sin cambios</option>
            <option value="client">Cliente</option>
            <option value="supplier">Proveedor</option>
            <option value="customer">Online</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={() => setBulkEditOpen(false)}
          className="px-4 py-2 rounded-xl bg-background border text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            await bulkUpdateContacts({
              ids: selected,
              updates: { /* valores del form */ }
            });
            setBulkEditOpen(false);
            setSelected([]);
            load({ reset: true });
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm"
        >
          Actualizar
        </button>
      </div>
    </div>
  </div>
)}
```

## 🎯 Cómo Usar

### Detectar Duplicados (Actualizado)
1. Click "Duplicados"
2. Ahora busca en parties + customers + suppliers
3. Muestra origen de cada duplicado
4. Fusionar en la cuenta correcta

### Edición Masiva
1. Seleccionar contactos con checkboxes
2. Click "Editar" en barra de acciones
3. Cambiar campos deseados
4. Click "Actualizar"

### Limitaciones
- Customers (Shopify) son read-only
- Solo se pueden editar parties y suppliers

## 📝 Siguientes Pasos

Si quieres la implementación completa del UI:
1. Puedo añadir los checkboxes funcionales en la tabla
2. Crear el dialog de edición masiva completo
3. Añadir edición inline (doble click en celdas)

**¿Quieres que implemente el UI completo ahora?**
