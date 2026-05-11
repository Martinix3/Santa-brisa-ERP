# 📝 REVISIÓN: Formulario Crear SKU en BOM

**Archivo:** `src/app/(app)/production/bom/page.tsx`  
**Líneas:** 328-340 (SBDialog de creación)

---

## 🔍 ANÁLISIS DEL FORMULARIO ACTUAL

### CÓDIGO ACTUAL

```typescript
<SBDialog open={createOpen} onOpenChange={setCreateOpen}>
  <SBDialogContent 
    title="Crear producto"
    description="Crea un producto rápido para usarlo como Output."
    primaryAction={{ label: "Crear", onClick: createOutputNow, disabled: !newName.trim() }}
    secondaryAction={{ label: "Cancelar", onClick: () => setCreateOpen(false) }}
  >
    <Field label="Nombre" name="new_product_name">
      <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
    </Field>
    <Field label="SKU (opcional)" name="new_product_sku">
      <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} />
    </Field>
  </SBDialogContent>
</SBDialog>
```

### LÓGICA DE CREACIÓN

```typescript
const createOutputNow = async () => {
  if (!newName.trim()) return;
  const category: "intermediate" | "fg" = fm.values.stage === "PRODUCCION" ? "intermediate" : "fg";
  const created = await onQuickCreateItem({
    name: newName.trim(),
    sku: newSku.trim() || undefined,
    category,
    packSizeMl: category === "fg" ? 700 : undefined,
  });
  fm.set("outputItemId", created.id);
  setCreateOpen(false);
};
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. SIN FEEDBACK DE CATEGORÍA ⚠️

**Problema:**
- El usuario no ve qué tipo de producto se creará
- Depende del stage (PRODUCCION → intermediate, ENVASADO → fg)
- Puede ser confuso

**Impacto:** Confusión en creación

### 2. PACKSIZE NO EDITABLE ⚠️

**Problema:**
- Campo `newPackSize` declarado pero NO usado en UI
- Siempre usa 700ml por defecto para FG
- ¿Qué pasa si quiero crear botella de 500ml, 1L, etc?

**Impacto:** Limitación funcional

### 3. SIN VALIDACIÓN DE SKU DUPLICADO ⚠️

**Problema:**
- No verifica si el SKU ya existe
- Puede crear duplicados
- Error solo se ve al guardar en servidor

**Impacto:** UX pobre, errores tardíos

### 4. SIN PREVIEW DE SKU AUTO-GENERADO ⚠️

**Problema:**
- Si dejas SKU vacío, se genera automáticamente
- Usuario no ve qué SKU se generará
- Sin transparencia

**Impacto:** Sorpresas, falta control

### 5. SIN ESTADO DE LOADING ⚠️

**Problema:**
- Botón "Crear" no muestra spinner durante creación
- Usuario no sabe si está procesando
- Puede hacer doble click

**Impacto:** UX confusa

### 6. SIN MANEJO DE ERRORES VISIBLE ⚠️

**Problema:**
- Si `onQuickCreateItem` falla, solo console.error
- No hay feedback visual al usuario
- Toast de error genérico

**Impacto:** Frustración del usuario

### 7. NO USA ENTER PARA SUBMIT ⚠️

**Problema:**
- Diálogo no captura Enter para crear
- Requiere click en botón
- Flujo menos natural

**Impacto:** UX subóptima

---

## ✅ MEJORAS PROPUESTAS

### MEJORA 1: Mostrar Categoría y Contexto

```typescript
<SBDialogContent 
  title="Crear Producto"
  description={
    fm.values.stage === "PRODUCCION" 
      ? "Creando Producto Intermedio (PI) para usar en esta receta de producción"
      : "Creando Producto Final (FG) para usar en esta receta de envasado"
  }
>
  {/* Badge visual */}
  <div className="mb-3 px-3 py-2 bg-info/10 border border-info/30 rounded-lg text-sm">
    <span className="font-semibold">Categoría:</span> {
      fm.values.stage === "PRODUCCION" ? "Producto Intermedio" : "Producto Final"
    }
  </div>
  {/* ... campos ... */}
</SBDialogContent>
```

### MEJORA 2: Campo Pack Size Editable (solo para FG)

```typescript
{fm.values.stage === "ENVASADO" && (
  <Field label="Tamaño de botella (ml)" name="new_product_packsize">
    <Select value={newPackSize} onChange={(e) => setNewPackSize(e.target.value)}>
      <option value="250">250 ml</option>
      <option value="500">500 ml</option>
      <option value="700">700 ml (Default)</option>
      <option value="1000">1 L (1000 ml)</option>
      <option value="">Otro (definir después)</option>
    </Select>
  </Field>
)}

// En createOutputNow
packSizeMl: category === "fg" ? (Number(newPackSize) || 700) : undefined,
```

### MEJORA 3: Validación de SKU Duplicado

```typescript
const [skuError, setSkuError] = useState<string>('');

const validateSku = useCallback((sku: string) => {
  if (!sku.trim()) {
    setSkuError('');
    return true;
  }
  
  const exists = allItems.some(item => 
    item.sku.toLowerCase() === sku.trim().toLowerCase()
  );
  
  if (exists) {
    setSkuError('Este SKU ya existe');
    return false;
  }
  
  setSkuError('');
  return true;
}, [allItems]);

// En el Input de SKU
<Input 
  value={newSku} 
  onChange={(e) => {
    setNewSku(e.target.value);
    validateSku(e.target.value);
  }}
  onBlur={() => validateSku(newSku)}
/>
{skuError && <p className="text-xs text-destructive mt-1">{skuError}</p>}
```

### MEJORA 4: Preview de SKU Auto-Generado

```typescript
const previewSku = useMemo(() => {
  if (newSku.trim()) return newSku.trim();
  if (!newName.trim()) return '';
  
  // Generar SKU preview basado en nombre
  const normalized = newName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 12);
  
  return `${normalized}_${Date.now().toString().slice(-4)}`;
}, [newName, newSku]);

// Mostrar preview
{!newSku.trim() && newName.trim() && (
  <div className="text-xs text-muted-foreground mt-1">
    SKU auto-generado: <code className="font-mono bg-secondary px-1 rounded">{previewSku}</code>
  </div>
)}
```

### MEJORA 5: Estado de Loading

```typescript
const [creating, setCreating] = useState(false);

const createOutputNow = async () => {
  if (!newName.trim()) return;
  if (skuError) return;
  
  setCreating(true);
  try {
    const category: "intermediate" | "fg" = fm.values.stage === "PRODUCCION" ? "intermediate" : "fg";
    const created = await onQuickCreateItem({
      name: newName.trim(),
      sku: newSku.trim() || undefined,
      category,
      packSizeMl: category === "fg" ? (Number(newPackSize) || 700) : undefined,
    });
    fm.set("outputItemId", created.id);
    toast.success(`Producto creado: ${created.sku}`);
    setCreateOpen(false);
  } catch (error) {
    toast.error(error.message || 'Error al crear producto');
  } finally {
    setCreating(false);
  }
};

// En primaryAction
primaryAction={{ 
  label: creating ? "Creando..." : "Crear", 
  onClick: createOutputNow, 
  disabled: !newName.trim() || !!skuError || creating 
}}
```

### MEJORA 6: Manejo de Errores Mejorado

```typescript
const onQuickCreateItem = useCallback(async (payload: QuickCreatePayload) => {
  try {
    const result = await upsertMinimalProduct({...payload});
    
    if (!result.ok) {
      // Mostrar error específico
      const errorMessage = result.message || "Error al crear el producto.";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Resto del código...
    return { id, sku };
    
  } catch (error) {
    // Re-throw para que createOutputNow lo maneje
    throw error;
  }
}, [santaData, saveAllCollections]);
```

### MEJORA 7: Submit con Enter

```typescript
<SBDialogContent 
  title="Crear Producto"
  // ... 
  onSubmit={(e) => {
    e.preventDefault();
    createOutputNow();
  }}
>
  {/* Los campos ya están en un form implícito de SBDialogContent */}
</SBDialogContent>
```

---

## 🎯 FORMULARIO MEJORADO COMPLETO

```typescript
// Estados ampliados
const [createOpen, setCreateOpen] = useState(false);
const [newName, setNewName] = useState("");
const [newSku, setNewSku] = useState("");
const [newPackSize, setNewPackSize] = useState<string>("700");
const [skuError, setSkuError] = useState<string>('');
const [creating, setCreating] = useState(false);

// Validación de SKU
const validateSku = useCallback((sku: string) => {
  if (!sku.trim()) {
    setSkuError('');
    return true;
  }
  
  const exists = allItems.some(item => 
    item.sku.toLowerCase() === sku.trim().toLowerCase()
  );
  
  if (exists) {
    setSkuError('❌ Este SKU ya existe');
    return false;
  }
  
  setSkuError('');
  return true;
}, [allItems]);

// Preview de SKU
const previewSku = useMemo(() => {
  if (newSku.trim()) return newSku.trim();
  if (!newName.trim()) return '';
  
  const normalized = newName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 12);
  
  return `${normalized}_${Date.now().toString().slice(-4)}`;
}, [newName, newSku]);

// Creación mejorada
const createOutputNow = async () => {
  if (!newName.trim()) return;
  if (skuError) return;
  
  setCreating(true);
  try {
    const category: "intermediate" | "fg" = fm.values.stage === "PRODUCCION" ? "intermediate" : "fg";
    const created = await onQuickCreateItem({
      name: newName.trim(),
      sku: newSku.trim() || undefined,
      category,
      packSizeMl: category === "fg" ? (Number(newPackSize) || 700) : undefined,
    });
    
    fm.set("outputItemId", created.id);
    toast.success(`✅ Producto creado: ${created.sku}`);
    
    // Resetear form
    setNewName("");
    setNewSku("");
    setNewPackSize("700");
    setSkuError("");
    setCreateOpen(false);
  } catch (error: any) {
    toast.error(error.message || 'Error al crear producto');
  } finally {
    setCreating(false);
  }
};

// UI mejorada
<SBDialog open={createOpen} onOpenChange={setCreateOpen}>
  <SBDialogContent 
    title="➕ Crear Producto Nuevo"
    description={
      fm.values.stage === "PRODUCCION" 
        ? "Creando Producto Intermedio (PI) para esta receta de producción"
        : "Creando Producto Final (FG) para esta receta de envasado"
    }
    primaryAction={{ 
      label: creating ? "Creando..." : "Crear Producto", 
      onClick: createOutputNow, 
      disabled: !newName.trim() || !!skuError || creating 
    }}
    secondaryAction={{ label: "Cancelar", onClick: () => setCreateOpen(false) }}
    onSubmit={(e) => { e.preventDefault(); createOutputNow(); }}
  >
    {/* Badge de categoría */}
    <div className="mb-4 px-3 py-2 bg-info/10 border border-info/30 rounded-lg text-sm flex items-center gap-2">
      <Factory size={16} className="text-info" />
      <div>
        <span className="font-semibold">Categoría:</span>{" "}
        {fm.values.stage === "PRODUCCION" ? "Producto Intermedio (PI)" : "Producto Final (FG)"}
      </div>
    </div>
    
    {/* Nombre */}
    <Field label="Nombre del producto" name="new_product_name" required>
      <Input 
        value={newName} 
        onChange={(e) => setNewName(e.target.value)} 
        placeholder="Ej: Santa Margarita PI, Botella SM 700ml"
        autoFocus 
      />
    </Field>
    
    {/* SKU */}
    <Field 
      label="SKU (código único)" 
      name="new_product_sku"
      hint="Dejar vacío para generar automáticamente"
      error={skuError}
    >
      <Input 
        value={newSku} 
        onChange={(e) => {
          setNewSku(e.target.value);
          validateSku(e.target.value);
        }}
        onBlur={() => validateSku(newSku)}
        placeholder="Ej: SM_PI_001"
      />
      {!newSku.trim() && newName.trim() && !skuError && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span>→ Se generará:</span>
          <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-info">
            {previewSku}
          </code>
        </div>
      )}
      {skuError && (
        <p className="text-xs text-destructive mt-1">{skuError}</p>
      )}
    </Field>
    
    {/* Pack Size - SOLO para FG */}
    {fm.values.stage === "ENVASADO" && (
      <Field label="Tamaño de botella" name="new_product_packsize">
        <Select 
          value={newPackSize} 
          onChange={(e) => setNewPackSize(e.target.value)}
        >
          <option value="250">250 ml (Miniatura)</option>
          <option value="500">500 ml (Media)</option>
          <option value="700">700 ml (Estándar) ⭐</option>
          <option value="1000">1000 ml (1 Litro)</option>
          <option value="1500">1500 ml (Magnum)</option>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Define el tamaño de la botella para cálculos de inventario
        </p>
      </Field>
    )}
    
    {/* Info helper */}
    <div className="mt-4 p-3 bg-secondary/20 rounded-lg text-xs space-y-1">
      <p className="font-semibold">ℹ️ Información</p>
      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
        <li>El producto se creará como <strong>{fm.values.stage === "PRODUCCION" ? "Producto Intermedio" : "Producto Final"}</strong></li>
        <li>UoM por defecto: <strong>{fm.values.stage === "PRODUCCION" ? "Litros (L)" : "Unidades (unit)"}</strong></li>
        {fm.values.stage === "ENVASADO" && (
          <li>Tamaño: <strong>{newPackSize || "700"} ml</strong></li>
        )}
        <li>Podrás editarlo después en la sección de Items</li>
      </ul>
    </div>
  </SBDialogContent>
</SBDialog>
```

---

## 📊 COMPARATIVA

| Aspecto | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Campos** | 2 | 3-4 | Más completo |
| **Validación** | ❌ No | ✅ SKU duplicado | +100% |
| **Feedback** | ❌ No | ✅ Categoría, preview SKU | +100% |
| **PackSize** | ❌ Hardcoded 700ml | ✅ Editable | Flexible |
| **Loading** | ❌ No | ✅ Spinner | Mejor UX |
| **Errores** | ❌ Console | ✅ Toast + inline | Visible |
| **Submit** | ❌ Solo click | ✅ Enter + click | Natural |
| **Info** | ❌ No | ✅ Helper box | Educativo |

---

## 🚀 BENEFICIOS

1. **Transparencia** - Usuario ve qué se va a crear
2. **Prevención** - Validación de SKU duplicado
3. **Flexibilidad** - PackSize editable para FG
4. **Feedback** - Loading, errores visibles, preview SKU
5. **Educación** - Info box explica qué pasará
6. **UX** - Submit con Enter, mejor flujo

---

## ✅ IMPLEMENTACIÓN RECOMENDADA

**Prioridad:** ALTA  
**Esfuerzo:** 2-3 horas  
**Impacto:** Alto en usabilidad

**¿Implemento estas mejoras ahora?**
