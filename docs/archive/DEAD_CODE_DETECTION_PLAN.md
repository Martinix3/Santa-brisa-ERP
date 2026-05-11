# Plan de Detección de Código Muerto - Santa Brisa ERP

## 📋 Resumen Ejecutivo

Este documento define una estrategia integral para identificar y eliminar código muerto en la aplicación Santa Brisa ERP, un sistema complejo basado en Next.js 15, React 19 y TypeScript con arquitectura modular.

**Fecha:** 19/01/2025
**Estado:** Plan Inicial
**Objetivo:** Identificar y catalogar código no utilizado para su posterior revisión y eliminación

---

## 🎯 Objetivos

1. **Identificar código muerto** en toda la aplicación
2. **Mejorar el rendimiento** reduciendo el bundle size
3. **Facilitar el mantenimiento** eliminando código obsoleto
4. **Documentar hallazgos** para toma de decisiones informada
5. **Establecer proceso repetible** para futuras auditorías

---

## 🏗️ Arquitectura del Proyecto

### Estructura de Directorios
```
src/
├── app/              # Next.js App Router (rutas y páginas)
├── components/       # Componentes React reutilizables
├── domain/          # Lógica de dominio y modelos SSOT
├── features/        # Features modulares
├── modules/         # Módulos de negocio
├── server/          # Server Actions y API
├── services/        # Servicios externos (Firebase, Gemini)
├── lib/             # Utilidades y helpers
├── hooks/           # React Hooks personalizados
├── types/           # Definiciones de TypeScript
└── config/          # Configuración
```

### Tecnologías Clave
- **Framework:** Next.js 15.5.4 con App Router
- **UI:** React 19.2.0 + TypeScript 5.9.3
- **Backend:** Firebase (Firestore, Auth, Storage)
- **IA:** Genkit AI + Google Generative AI
- **Estilos:** Tailwind CSS 4.1.13
- **Testing:** Vitest 3.2.4

---

## 🔍 Estrategia de Detección (Multi-Capa)

### Capa 1: Análisis Estático Automatizado

#### 1.1 TypeScript Compiler (ts-unused-exports)
```bash
# Instalar herramienta
npm install --save-dev ts-unused-exports

# Ejecutar análisis
npx ts-unused-exports tsconfig.json --ignoreFiles='**/*.test.ts|**/*.spec.ts'
```

**Detecta:**
- Exports no utilizados
- Funciones exportadas sin referencias
- Tipos e interfaces sin uso

**Limitaciones:**
- No detecta código dinámico
- Puede dar falsos positivos con re-exports

#### 1.2 ESLint con Plugins
```bash
# Instalar plugins
npm install --save-dev eslint-plugin-unused-imports @typescript-eslint/eslint-plugin

# Configurar en eslint.config.js
```

**Configuración recomendada:**
```javascript
{
  plugins: ['unused-imports', '@typescript-eslint'],
  rules: {
    'unused-imports/no-unused-imports': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  }
}
```

**Detecta:**
- Imports no utilizados
- Variables declaradas sin uso
- Parámetros de función sin referencias

#### 1.3 Dependency Cruiser (ya instalado)
```bash
# Ya está configurado en .dependency-cruiser.js
npm run analyze
```

**Detecta:**
- Dependencias circulares
- Módulos no referenciados
- Imports inválidos

#### 1.4 Knip (Recomendado - Análisis Integral)
```bash
# Instalar
npm install --save-dev knip

# Ejecutar
npx knip
```

**Detecta:**
- Archivos no referenciados
- Dependencias npm no utilizadas
- Exports sin uso
- Tipos sin referencias
- Enum values sin uso

**Configuración recomendada (knip.json):**
```json
{
  "entry": [
    "src/app/**/*.tsx",
    "src/app/**/*.ts",
    "src/middleware.ts"
  ],
  "project": ["src/**/*.ts", "src/**/*.tsx"],
  "ignore": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/tests/**",
    "scripts/**"
  ],
  "ignoreDependencies": [
    "cross-env",
    "patch-package"
  ]
}
```

### Capa 2: Análisis de Bundle (Webpack/Next.js)

#### 2.1 Next.js Bundle Analyzer (ya instalado)
```bash
# Ejecutar análisis
ANALYZE=true npm run build
```

**Genera:**
- Visualización interactiva del bundle
- Tamaño de cada módulo
- Dependencias incluidas

**Buscar:**
- Módulos grandes sin justificación
- Librerías duplicadas
- Código que solo se usa en desarrollo

#### 2.2 Source Map Explorer
```bash
# Instalar
npm install --save-dev source-map-explorer

# Analizar
source-map-explorer '.next/static/**/*.js'
```

**Detecta:**
- Código no alcanzable
- Importaciones innecesarias en el cliente
- Dead code eliminado por tree-shaking

### Capa 3: Análisis Dinámico (Runtime)

#### 3.1 Code Coverage con Vitest
```bash
# Ejecutar con coverage
npm run test -- --coverage

# O específico para componentes
vitest run --coverage --coverage.reporter=html --coverage.reporter=text
```

**Configuración en vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/tests/**',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: 0, // Sin threshold para análisis inicial
        functions: 0,
        branches: 0,
        statements: 0
      }
    }
  }
})
```

**Identifica:**
- Líneas de código nunca ejecutadas
- Funciones sin cobertura
- Ramas condicionales no probadas

#### 3.2 Chrome DevTools Coverage
**Proceso manual:**
1. Abrir DevTools (F12)
2. Cmd+Shift+P → "Show Coverage"
3. Recargar página y navegar por la aplicación
4. Analizar código no ejecutado en rojo

**Útil para:**
- Código CSS no utilizado
- JavaScript del cliente sin ejecución
- Componentes que nunca se renderizan

### Capa 4: Análisis de Rutas Next.js

#### 4.1 Route Collision Detection (ya implementado)
```bash
# Script existente
node scripts/find-route-collisions.mjs
```

#### 4.2 Page Component Usage Analysis
**Script personalizado a crear:**
```bash
# Verificar qué páginas tienen tráfico
# Requiere analytics o logs
```

**Detecta:**
- Páginas sin visitas en producción
- Routes sin referencias en navegación
- Páginas duplicadas o obsoletas

### Capa 5: Análisis de Base de Datos y Server Actions

#### 5.1 Server Actions Audit
**Script a crear:**
```typescript
// scripts/audit-server-actions.ts
// Verificar qué server actions se llaman desde el cliente
```

**Detecta:**
- Server actions sin referencias
- API routes obsoletas
- Funciones de Firebase sin uso

#### 5.2 Firestore Collection Usage
**Verificar colecciones activas:**
```typescript
// Comparar colecciones definidas vs. colecciones en uso
// Analizar queries que no se ejecutan
```

### Capa 6: Análisis de Componentes React

#### 6.1 Component Usage Tracing
```bash
# Instalar
npm install --save-dev react-scanner

# Escanear componentes
npx react-scanner src/components
```

**Detecta:**
- Componentes nunca importados
- Props que nunca se pasan
- Componentes duplicados

#### 6.2 Storybook Inventory (si aplica)
Si tenéis Storybook:
- Componentes sin stories
- Stories de componentes eliminados

---

## 📊 Plan de Ejecución por Fases

### FASE 1: Preparación y Setup (1-2 días)

#### Día 1: Configuración de Herramientas
- [ ] Instalar knip, ts-unused-exports
- [ ] Configurar eslint-plugin-unused-imports
- [ ] Actualizar scripts en package.json
- [ ] Crear carpeta `dead-code-analysis/` para reportes
- [ ] Documentar comandos en README

#### Día 2: Scripts Personalizados
- [ ] Crear script de análisis de server actions
- [ ] Crear script de análisis de rutas Next.js
- [ ] Crear script consolidador de reportes
- [ ] Configurar coverage en Vitest

### FASE 2: Análisis Estático (2-3 días)

#### Análisis TypeScript
```bash
# Ejecutar todos los análisis estáticos
npm run dead-code:static
```

**Script a crear en package.json:**
```json
{
  "scripts": {
    "dead-code:static": "npm run dead-code:typescript && npm run dead-code:eslint && npm run dead-code:knip",
    "dead-code:typescript": "npx ts-unused-exports tsconfig.json --ignoreFiles='**/*.test.ts' > dead-code-analysis/typescript-unused.txt",
    "dead-code:eslint": "eslint . --format json --output-file dead-code-analysis/eslint-report.json",
    "dead-code:knip": "npx knip --reporter json > dead-code-analysis/knip-report.json"
  }
}
```

**Tareas:**
- [ ] Ejecutar ts-unused-exports
- [ ] Ejecutar knip analysis
- [ ] Ejecutar dependency-cruiser
- [ ] Consolidar resultados en spreadsheet
- [ ] Categorizar hallazgos (crítico/medio/bajo)

### FASE 3: Análisis de Bundle (1 día)

```bash
# Análisis de bundle
ANALYZE=true npm run build
```

**Tareas:**
- [ ] Generar bundle analysis
- [ ] Identificar módulos grandes (>100KB)
- [ ] Documentar dependencias duplicadas
- [ ] Revisar tree-shaking effectiveness
- [ ] Analizar code splitting

### FASE 4: Análisis Dinámico (2-3 días)

#### Coverage Analysis
```bash
# Ejecutar tests con coverage
npm run test -- --coverage
```

**Tareas:**
- [ ] Ejecutar suite de tests con coverage
- [ ] Analizar HTML coverage report
- [ ] Identificar funciones con 0% coverage
- [ ] Documentar archivos sin tests
- [ ] Analizar código crítico sin cobertura

#### Manual Testing
- [ ] Ejecutar Chrome DevTools Coverage en producción
- [ ] Navegar por todas las rutas principales
- [ ] Registrar código no ejecutado
- [ ] Documentar funcionalidades no accesibles

### FASE 5: Análisis de Arquitectura (2 días)

#### Components & Modules
**Tareas:**
- [ ] Analizar árbol de componentes
- [ ] Verificar imports en cada módulo
- [ ] Identificar módulos huérfanos
- [ ] Documentar dependencias circulares
- [ ] Revisar features sin uso

#### Server & API
**Tareas:**
- [ ] Auditar server actions (`src/server/actions/`)
- [ ] Verificar uso de cada action desde el cliente
- [ ] Revisar API routes si existen
- [ ] Analizar servicios de Firebase
- [ ] Documentar queries Firestore sin uso

### FASE 6: Consolidación y Reporte (2 días)

#### Generación de Reporte Master
**Estructura del reporte:**
```markdown
# Dead Code Analysis Report
## Executive Summary
- Total files analyzed
- Dead code percentage
- Priority recommendations

## Detailed Findings
### High Priority (código definitivamente muerto)
### Medium Priority (probablemente muerto)
### Low Priority (requiere validación manual)

## Recommendations
### Quick Wins (eliminar sin riesgo)
### Requires Review (validar con equipo)
### Keep for Now (razones documentadas)
```

**Tareas:**
- [ ] Consolidar todos los reportes
- [ ] Categorizar hallazgos
- [ ] Calcular métricas (KB ahorrados, % código muerto)
- [ ] Crear roadmap de limpieza
- [ ] Presentar a equipo

---

## 🛠️ Scripts a Crear

### 1. dead-code-analyzer.ts
```typescript
// scripts/dead-code-analyzer.ts
import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

interface DeadCodeReport {
  unusedExports: string[];
  unusedFiles: string[];
  unusedImports: string[];
  statistics: {
    totalFiles: number;
    deadCodeFiles: number;
    percentageUnused: number;
  };
}

async function analyzeDeadCode(): Promise<DeadCodeReport> {
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
  });

  const sourceFiles = project.getSourceFiles();
  const report: DeadCodeReport = {
    unusedExports: [],
    unusedFiles: [],
    unusedImports: [],
    statistics: {
      totalFiles: sourceFiles.length,
      deadCodeFiles: 0,
      percentageUnused: 0,
    },
  };

  // Analizar cada archivo
  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    
    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      continue;
    }

    // Verificar exports sin uso
    const exports = sourceFile.getExportedDeclarations();
    // ... lógica de análisis ...
  }

  return report;
}

// Ejecutar y guardar reporte
analyzeDeadCode().then(report => {
  fs.writeFileSync(
    'dead-code-analysis/master-report.json',
    JSON.stringify(report, null, 2)
  );
  console.log('Dead code analysis complete!');
});
```

### 2. route-usage-analyzer.ts
```typescript
// scripts/route-usage-analyzer.ts
import * as fs from 'fs';
import * as path from 'path';
import { globby } from 'globby';

async function analyzeRoutes() {
  // Encontrar todas las páginas en app/
  const pages = await globby('src/app/**/page.{tsx,ts,jsx,js}');
  
  // Buscar referencias a cada ruta
  const allFiles = await globby('src/**/*.{tsx,ts,jsx,js}');
  
  const routeUsage = new Map<string, string[]>();
  
  for (const page of pages) {
    const route = page
      .replace('src/app/', '')
      .replace('/page.tsx', '')
      .replace('/page.ts', '');
    
    const references: string[] = [];
    
    // Buscar referencias a esta ruta
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes(`"/${route}"`) || content.includes(`'/${route}'`)) {
        references.push(file);
      }
    }
    
    routeUsage.set(route, references);
  }
  
  // Identificar rutas sin referencias
  const unusedRoutes = Array.from(routeUsage.entries())
    .filter(([_, refs]) => refs.length === 0)
    .map(([route]) => route);
  
  console.log('Unused routes:', unusedRoutes);
  
  fs.writeFileSync(
    'dead-code-analysis/unused-routes.json',
    JSON.stringify({ unusedRoutes, routeUsage: Object.fromEntries(routeUsage) }, null, 2)
  );
}

analyzeRoutes();
```

### 3. consolidate-reports.ts
```typescript
// scripts/consolidate-reports.ts
import * as fs from 'fs';

interface ConsolidatedReport {
  summary: {
    totalIssues: number;
    byCategory: Record<string, number>;
    estimatedSavings: string;
  };
  findings: {
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
  };
  recommendations: string[];
}

function consolidateReports(): ConsolidatedReport {
  // Leer todos los reportes
  const knipReport = JSON.parse(
    fs.readFileSync('dead-code-analysis/knip-report.json', 'utf-8')
  );
  
  const eslintReport = JSON.parse(
    fs.readFileSync('dead-code-analysis/eslint-report.json', 'utf-8')
  );
  
  // ... consolidar lógica ...
  
  const consolidated: ConsolidatedReport = {
    summary: {
      totalIssues: 0,
      byCategory: {},
      estimatedSavings: '0KB',
    },
    findings: {
      highPriority: [],
      mediumPriority: [],
      lowPriority: [],
    },
    recommendations: [],
  };
  
  return consolidated;
}

const report = consolidateReports();
fs.writeFileSync(
  'dead-code-analysis/CONSOLIDATED_REPORT.md',
  generateMarkdownReport(report)
);

function generateMarkdownReport(report: ConsolidatedReport): string {
  return `# Dead Code Analysis - Consolidated Report
  
## Summary
- Total Issues: ${report.summary.totalIssues}
- Estimated Savings: ${report.summary.estimatedSavings}

## High Priority Findings
${report.findings.highPriority.map(f => `- ${f}`).join('\n')}

## Recommendations
${report.recommendations.map(r => `1. ${r}`).join('\n')}
`;
}
```

---

## 📁 Estructura de Reportes

```
dead-code-analysis/
├── reports/
│   ├── typescript-unused.txt
│   ├── knip-report.json
│   ├── eslint-report.json
│   ├── bundle-analysis/
│   │   ├── client.html
│   │   └── server.html
│   ├── coverage/
│   │   └── index.html
│   ├── unused-routes.json
│   └── unused-server-actions.json
├── CONSOLIDATED_REPORT.md
└── CLEANUP_ROADMAP.md
```

---

## ⚠️ Consideraciones Importantes

### Falsos Positivos Comunes

1. **Exports usados dinámicamente**
   ```typescript
   // Puede parecer sin uso pero se usa dinámicamente
   export const actions = { create, update, delete };
   ```

2. **Props opcionales de componentes**
   ```typescript
   // Puede no usarse ahora pero es parte de la API
   interface ButtonProps {
     variant?: 'primary' | 'secondary';
   }
   ```

3. **Código de integración externa**
   ```typescript
   // Usado por Firebase Cloud Functions
   export const onUserCreate = functions.auth.user().onCreate(...);
   ```

4. **Tipos exportados para consumidores**
   ```typescript
   // Usado por otros proyectos/librerías
   export type { User, Product };
   ```

### Qué NO Eliminar sin Validación

- ❌ Archivos de configuración (aunque parezcan sin uso)
- ❌ Types/interfaces exportadas (pueden ser API pública)
- ❌ Código relacionado con integraciones (Holded, Shopify, etc.)
- ❌ Server actions recientes (pueden estar en desarrollo)
- ❌ Componentes de diseño system (aunque no se usen aún)
- ❌ Código de migración/setup (puede necesitarse en futuro)

### Validación Manual Requerida

Para cada hallazgo de código muerto:
1. ✅ Verificar en Git history si es código nuevo
2. ✅ Buscar referencias en documentación
3. ✅ Preguntar al equipo si está en uso
4. ✅ Verificar si es parte de una feature flag
5. ✅ Comprobar si se usa en producción (logs/analytics)

---

## 📈 Métricas de Éxito

### KPIs a Medir

1. **Bundle Size Reduction**
   - Antes: `X MB`
   - Después: `Y MB`
   - Reducción: `Z%`

2. **Archivos Eliminados**
   - Componentes: `N archivos`
   - Utilidades: `M archivos`
   - Total: `X archivos`

3. **Lines of Code Removed**
   - TypeScript: `X líneas`
   - CSS: `Y líneas`
   - Total: `Z líneas`

4. **Build Time Improvement**
   - Antes: `X segundos`
   - Después: `Y segundos`
   - Mejora: `Z%`

5. **Type-checking Speed**
   - Antes: `X segundos`
   - Después: `Y segundos`

---

## 🚀 Quick Start

### Ejecutar Análisis Completo

```bash
# 1. Instalar herramientas
npm install --save-dev knip ts-unused-exports eslint-plugin-unused-imports

# 2. Crear carpeta de reportes
mkdir -p dead-code-analysis/reports

# 3. Ejecutar análisis estático
npm run dead-code:static

# 4. Ejecutar análisis de bundle
ANALYZE=true npm run build

# 5. Ejecutar coverage
npm run test -- --coverage

# 6. Consolidar reportes
npm run dead-code:consolidate

# 7. Revisar reporte
open dead-code-analysis/CONSOLIDATED_REPORT.md
```

---

## 📋 Checklist de Ejecución

### Pre-análisis
- [ ] Crear rama específica: `git checkout -b analysis/dead-code-detection`
- [ ] Asegurar que todos los tests pasan
- [ ] Documentar estado actual del proyecto
- [ ] Backup de archivos importantes

### Durante análisis
- [ ] Ejecutar todas las herramientas
- [ ] Documentar todos los hallazgos
- [ ] Categorizar por prioridad
- [ ] Validar falsos positivos
- [ ] Consultar con el equipo

### Post-análisis
- [ ] Crear CLEANUP_ROADMAP.md con plan de acción
- [ ] Priorizar quick wins
- [ ] Agendar sesiones de revisión
- [ ] Establecer proceso de prevención
- [ ] Documentar lecciones aprendidas

---

## 🔄 Proceso Continuo

### Prevención de Código Muerto

1. **Pre-commit Hooks**
   ```bash
   # .husky/pre-commit
   npm run lint
   npm run typecheck
   ```

2. **CI/CD Integration**
   ```yaml
   # .github/workflows/dead-code-check.yml
   - name: Check for unused exports
     run: npx knip --reporter github-actions
   ```

3. **Monthly Reviews**
   - Ejecutar knip mensualmente
   - Revisar coverage trends
   - Actualizar documentación

4. **Code Review Guidelines**
   - Verificar que imports eliminados no dejen exports huérfanos
   - Marcar componentes deprecados explícitamente
   - Documentar razones para código que "parece" muerto

---

## 📚 Referencias y Recursos

### Herramientas
- [Knip](https://github.com/webpro/knip) - Find unused files, dependencies and exports
- [ts-unused-exports](https://github.com/pzavolinsky/ts-unused-exports) - Find unused TypeScript exports
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Validate and visualize dependencies
- [madge](https://github.com/pahen/madge) - Create graphs from module dependencies

### Documentación
- [Next.js Bundle Analysis](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

### Artículos
- [Removing Dead Code in Large TypeScript Projects](https://engineering.klarna.com/removing-dead-code-in-large-projects-d0f4dcd82acf)
- [Dead Code Elimination in JavaScript](https://web.dev/reduce-javascript-payloads-with-tree-shaking/)

---

## 👥 Equipo y Roles

### Responsables
- **Lead Developer:** Coordinación general y validación técnica
- **QA:** Validación de funcionalidad post-limpieza
- **Product Owner:** Validación de features aparentemente muertas
- **DevOps:** Análisis de impacto en build/deploy

### Comunicación
- Daily updates en Slack channel #dead-code-cleanup
- Weekly review meetings
- Final presentation de resultados

---

## 🎯 Próximos Pasos Inmediatos

1. **Revisar y aprobar este plan** con el equipo
2. **Asignar responsables** para cada fase
3. **Crear rama de análisis** en Git
4. **Instalar herramientas** (Fase 1, Día 1)
5. **Ejecutar primer análisis estático** (Fase 2)
6. **Agendar sesión de revisión** de resultados iniciales

---

**Última actualización:** 19/01/2025
**Versión:** 1.0
**Estado:** ✅ Plan Completo - Pendiente de Aprobación
