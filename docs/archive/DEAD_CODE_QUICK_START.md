# 🚀 Quick Start - Detección de Código Muerto

## ✅ Configuración Completada

Se ha creado la configuración de **Knip** optimizada para Santa Brisa ERP con:

- ✅ `knip.json` - Configuración que incluye el layout principal y todas las rutas Next.js
- ✅ Scripts npm listos para usar
- ✅ Knip ya instalado (v5.66.0)

## 📋 Comandos Disponibles

### 1. Análisis Básico (Recomendado para empezar)
```bash
npm run dead-code:knip
```
Este comando analiza todo el proyecto y muestra en consola:
- Archivos no utilizados
- Exports sin referencias
- Dependencias npm no usadas
- Tipos e interfaces sin uso

### 2. Análisis con Reporte JSON
```bash
npm run dead-code:setup    # Crea la carpeta de reportes (solo primera vez)
npm run dead-code:knip-json # Genera reporte en JSON
```
Genera: `dead-code-analysis/knip-report.json`

### 3. Análisis con Símbolos Detallados
```bash
npm run dead-code:knip-symbols
```
Muestra todos los exports, tipos e interfaces con su estado de uso.

## 🎯 Flujo de Trabajo Recomendado

### Paso 1: Primer Análisis
```bash
# Crear carpeta de reportes
npm run dead-code:setup

# Ejecutar análisis
npm run dead-code:knip
```

### Paso 2: Revisar Resultados
Knip mostrará categorías como:
- **files**: Archivos completamente sin uso
- **exports**: Exports sin referencias
- **types**: Tipos TypeScript sin uso
- **dependencies**: Paquetes npm no utilizados
- **duplicates**: Exports duplicados

### Paso 3: Validar Hallazgos
⚠️ **IMPORTANTE**: No eliminar código sin validar primero

Para cada hallazgo:
1. Verificar si es código dinámico (usado en runtime)
2. Revisar si es parte de una API pública
3. Consultar con el equipo
4. Verificar en Git history

### Paso 4: Generar Reporte para el Equipo
```bash
npm run dead-code:knip-json
```

## 📖 Entender los Resultados

### Ejemplo de Salida:
```
✖ 15 files are not listed as entry files or dependencies
✖ 42 exports are unused
✖ 8 types are unused
✖ 3 dependencies are unused
```

### Categorías:

#### 🔴 files (Archivos no referenciados)
Archivos que no están importados en ninguna parte. **Alta probabilidad de código muerto**.

#### 🟡 exports (Exports sin uso)
Funciones/variables exportadas pero no importadas. **Revisar antes de eliminar**.

#### 🟡 types (Tipos sin uso)
Interfaces/tipos TypeScript no utilizados. **Puede ser API pública**.

#### 🟢 dependencies (Dependencias npm sin uso)
Paquetes en package.json no importados. **Candidatos para eliminación**.

## ⚙️ Configuración (knip.json)

### Puntos de Entrada Configurados:
```json
{
  "entry": [
    "src/app/layout.tsx",           // ✅ Layout principal
    "src/app/page.tsx",             // ✅ Página home
    "src/app/**/layout.tsx",        // ✅ Todos los layouts
    "src/app/**/page.tsx",          // ✅ Todas las páginas
    "src/app/**/route.ts",          // ✅ API routes
    "src/app/ClientProviders.tsx",  // ✅ Providers
    "src/middleware.ts"             // ✅ Middleware
  ]
}
```

### Archivos Ignorados:
- Tests: `**/*.test.ts`, `**/*.spec.ts`
- Carpetas de tests: `**/tests/**`, `**/__tests__/**`
- Scripts: `scripts/**`
- Definiciones de tipos: `**/*.d.ts`

### Path Aliases Configurados:
```json
{
  "@/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@lib/*": ["src/lib/*"],
  "@server/*": ["src/server/*"],
  "@domain/*": ["src/domain/*"],
  // ... etc
}
```

## 🎨 Modos de Reporte

### Modo Symbols (Detallado)
```bash
npm run dead-code:knip-symbols
```
Muestra cada export con su ubicación y referencias.

### Modo JSON (Para procesamiento)
```bash
npm run dead-code:knip-json
```
Genera JSON para análisis programático o dashboards.

## 🔍 Casos Especiales

### Next.js App Router
El layout principal (`src/app/layout.tsx`) está marcado con `!` en la configuración:
```json
"next": {
  "entry": [
    "src/app/layout.tsx!",  // ← El ! lo marca como obligatorio
  ]
}
```

### Server Actions
Los server actions pueden parecer sin uso si solo se usan en formularios:
```typescript
// Este export puede aparecer como "sin uso" pero se usa en forms
export async function createCampaign(formData: FormData) {
  'use server'
  // ...
}
```

### Componentes de Diseño System
Componentes genéricos pueden no usarse aún pero son parte del sistema:
```typescript
// Puede no usarse pero es parte de la librería de componentes
export function Tooltip({ children }: Props) { ... }
```

## 📊 Análisis Complementarios

### Bundle Analyzer (ya configurado)
```bash
ANALYZE=true npm run build
```
Analiza el tamaño del bundle y qué módulos se incluyen.

### Dependency Cruiser (ya configurado)
```bash
npm run analyze
```
Detecta dependencias circulares y módulos no referenciados.

## ⚠️ Falsos Positivos Comunes

1. **Código usado dinámicamente**
   ```typescript
   // Knip no detecta esto
   const action = actions[actionName]; 
   ```

2. **Exports para consumidores externos**
   ```typescript
   // Puede parecer sin uso pero es API pública
   export type { Campaign, CampaignStatus };
   ```

3. **Hooks de frameworks**
   ```typescript
   // Usado por Firebase pero puede parecer sin uso
   export const onUserCreate = functions.auth.user().onCreate();
   ```

4. **Páginas dinámicas de Next.js**
   ```typescript
   // El [id] puede confundir al análisis
   src/app/campaigns/[id]/page.tsx
   ```

## 📝 Workflow Completo

```bash
# 1. Preparación
npm run dead-code:setup

# 2. Análisis inicial
npm run dead-code:knip > dead-code-analysis/initial-report.txt

# 3. Análisis detallado
npm run dead-code:knip-json

# 4. Revisar resultados
cat dead-code-analysis/knip-report.json | jq .

# 5. Análisis de bundle
ANALYZE=true npm run build

# 6. Tests con coverage
npm run test -- --coverage
```

## 🎯 Próximos Pasos

1. **Ejecutar primer análisis**: `npm run dead-code:knip`
2. **Revisar resultados** con el equipo
3. **Validar hallazgos críticos**
4. **Documentar falsos positivos**
5. **Crear plan de limpieza** priorizado
6. **Iterar** en sprints pequeños

## 📚 Recursos

- **Plan Completo**: Ver `DEAD_CODE_DETECTION_PLAN.md`
- **Documentación Knip**: https://knip.dev/
- **Next.js + Knip**: https://knip.dev/guides/next

## 💡 Tips

- Ejecutar knip después de cada feature importante
- Revisar antes de releases
- Documentar razones para "falsos positivos"
- Configurar en CI/CD para prevención continua

---

**Última actualización**: 19/01/2025
**Estado**: ✅ Listo para usar
