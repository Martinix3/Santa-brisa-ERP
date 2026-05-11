# GUÍA DE TESTING: OpportunityDrawer Mejorado

**Fecha:** 26 de Octubre de 2025  
**Componente:** OpportunityDrawer  
**Ubicación:** `src/ui/drawers/drawers/OpportunityDrawer.tsx`

---

## 🚀 CÓMO PROBAR EL OPPORTUNITYDRAWER

### Paso 1: Iniciar el Servidor de Desarrollo

```bash
# En la terminal, desde la raíz del proyecto
npm run dev
```

Espera a que el servidor inicie. Deberías ver algo como:
```
✓ Ready in 3.2s
○ Local:   http://localhost:3000
```

### Paso 2: Navegar al Pipeline

1. Abre tu navegador en `http://localhost:3000`
2. Inicia sesión si es necesario
3. Navega a **Ventas → Pipeline** o directamente a:
   ```
   http://localhost:3000/ventas/pipeline
   ```

### Paso 3: Abrir el Drawer

En la vista del Pipeline (Kanban), verás tarjetas de cuentas organizadas por etapas:
- **POTENCIAL**
- **SEGUIMIENTO**
- **ACTIVA**
- **FALLIDA**

**Para abrir el drawer:**
1. Haz clic en el botón **"Editar"** de cualquier tarjeta
2. El OpportunityDrawer debería abrirse desde el lado derecho

---

## ✅ CHECKLIST DE TESTING

### Visualización General

- [ ] El drawer se abre correctamente
- [ ] El título muestra el nombre de la cuenta
- [ ] El badge "Target" aparece si `isTarget: true`
- [ ] La ciudad y zona se muestran correctamente
- [ ] El botón "✕" de cerrar funciona

### Sección de Alertas

- [ ] Si hay alertas (`hasAlerts: true`), aparece el banner naranja
- [ ] El icono de campana (Bell) se muestra
- [ ] Si no hay consumo (`noConsumption: true`), aparece el indicador
- [ ] El icono de tendencia bajista (TrendingDown) se muestra

### Métricas Clave (3 tarjetas)

- [ ] **Último contacto:** Muestra días y fecha
- [ ] **Último pedido:** Muestra días
- [ ] **Valor estimado:** Muestra cantidad en euros con formato

### Información Comercial

- [ ] Muestra el comercial asignado si existe
- [ ] Muestra el distribuidor si existe
- [ ] Badge "POS Instalado" aparece si `posInstalled: true`

### Nota Rápida

- [ ] El textarea permite escribir
- [ ] El botón "Guardar nota" está deshabilitado si el texto está vacío
- [ ] Al hacer clic en "Guardar nota" aparece un alert (temporal)
- [ ] El textarea se limpia después de guardar

### Acciones Rápidas (4 botones)

#### 1. Nuevo Pedido
- [ ] El botón existe y es visible
- [ ] Al hacer clic, debería abrir el drawer `new-order`
- [ ] El drawer actual se cierra

#### 2. Crear Visita
- [ ] El botón existe y es visible
- [ ] Al hacer clic, aparece un alert "Funcionalidad de visita en desarrollo"
- [ ] (Temporal hasta implementar `visit-onsite` drawer)

#### 3. Enviar Email
- [ ] El botón existe y es visible
- [ ] Al hacer clic, aparece un alert "Funcionalidad de email en desarrollo"
- [ ] (Temporal hasta implementar `email-reply` drawer)

#### 4. Cambiar Etapa
- [ ] El botón existe y es visible
- [ ] Al hacer clic, debería abrir el drawer `move-stage`
- [ ] Pasa el `accountId` y `currentStage` correctamente

### Footer

- [ ] Botón "Cerrar" funciona y cierra el drawer
- [ ] Botón "Ver Detalle Completo" funciona
- [ ] Al hacer clic en "Ver Detalle Completo":
  - Navega a `/accounts/[id]`
  - El drawer se cierra

### Responsive

- [ ] En desktop (>1024px): Drawer se ve bien
- [ ] En tablet (768-1024px): Layout se adapta
- [ ] En móvil (<768px): Grid de métricas se apila verticalmente

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema 1: El drawer no se abre

**Síntoma:** Al hacer clic en "Editar", no pasa nada

**Solución:**
1. Verifica que el servidor esté corriendo
2. Abre la consola del navegador (F12)
3. Busca errores en rojo
4. Verifica que `DrawerController` esté importando `OpportunityDrawer`

### Problema 2: Datos no se muestran

**Síntoma:** El drawer se abre pero está vacío o con "—"

**Posibles causas:**
- Los datos de Firebase no están cargando
- El objeto `PipelineItem` no tiene los campos esperados
- Hay un error en la transformación de datos

**Solución:**
1. Abre la consola del navegador
2. Busca el objeto que se pasa al drawer
3. Verifica que tenga los campos: `name`, `city`, `zone`, `lastInteractionDays`, etc.

### Problema 3: Botones no funcionan

**Síntoma:** Al hacer clic en botones, no pasa nada

**Solución:**
1. Verifica que `useDrawer()` esté funcionando
2. Comprueba que `DrawerController` tenga los drawers registrados
3. Mira la consola por errores

### Problema 4: Estilos rotos

**Síntoma:** El drawer se ve mal, sin estilos

**Solución:**
1. Verifica que las clases CSS existan:
   - `sb-drawer`
   - `sb-drawer--medium`
   - `sb-card-glass-light`
   - `sb-btn`
2. Comprueba que el archivo de estilos esté cargando

---

## 📊 CASOS DE PRUEBA ESPECÍFICOS

### Caso 1: Cuenta Target con Alertas

**Datos de prueba:**
```typescript
{
  id: 'test-001',
  name: 'Restaurante El Patio',
  stage: 'POTENCIAL',
  city: 'Madrid',
  zone: 'Centro',
  isTarget: true,
  hasAlerts: true,
  lastInteractionDays: 5,
  lastOrderDays: 30,
  estValueEUR: 12500,
  commercialId: 'com-001',
  distributorPartyId: 'dist-001',
  posInstalled: false
}
```

**Verificar:**
- ✅ Badge "Target" visible
- ✅ Banner de alertas naranja
- ✅ Todas las métricas pobladas
- ✅ Sin badge "POS Instalado"

### Caso 2: Cuenta Activa con POS

**Datos de prueba:**
```typescript
{
  id: 'test-002',
  name: 'Hotel Costa Azul',
  stage: 'ACTIVA',
  city: 'Barcelona',
  zone: 'Noreste',
  isTarget: false,
  hasAlerts: false,
  noConsumption: true,
