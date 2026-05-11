# AUDITORÍA: Integración Gmail → Gemini → Alertas/Tasks

**Fecha**: 20 de enero de 2025  
**Estado**: ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

## 🎯 Objetivo de la Auditoría

Revisar cómo Gemini convierte emails en alertas y tareas, y verificar que funcione correctamente.

---

## 📊 RESUMEN EJECUTIVO

### ❌ Problemas Críticos

1. **Gmail Sync NO usa Intelligence Hub**: El procesamiento de emails no pasa por el orquestador central
2. **Email Analyzer NO llama a Gemini API**: Solo usa reglas básicas, no IA real
3. **Duplicación de lógica**: Código duplicado entre `sync.ts` e `intelligence-hub.ts`
4. **Alertas no se crean**: Los emails urgentes no generan alertas automáticamente

### ✅ Aspectos Positivos

1. Estructura bien diseñada del Intelligence Hub
2. Email Analyzer con clasificación de departamentos implementada
3. Análisis de sentimiento y prioridad funcional (basado en reglas)
4. Document Analyzer para attachments

---

## 🔍 ANÁLISIS DETALLADO

### 1. Flujo Actual (Gmail Sync)

**Archivo**: `src/server/integrations/gmail/sync.ts`

```typescript
private async processEmail(email: ParsedEmail): Promise<void> {
  // 1. Identificar cuenta
  const account = await this.identifyAccount(email.from);
  
  // 2. Analizar email con IA ❌ NO USA INTELLIGENCE HUB
  const analysis = await this.analyzeEmail(email);
  
  // 3. Crear interacción
  const interaction: Interaction = {
    // ... datos de la interacción
  };
  await db.collection('interactions').doc(interaction.id).set(interaction);
  
  // 4. Crear tarea si requiere acción
  if (analysis?.requiresAction) {
    await this.createTaskFromEmail(interaction, analysis);
  }
}
```

**Problemas**:
- ❌ No pasa por `processEmailWithIntelligence()` del Intelligence Hub
- ❌ No crea alertas automáticas para emails urgentes
- ❌ Lógica duplicada de creación de tareas
- ❌ No aprovecha el sistema de acciones sugeridas

### 2. Email Analyzer (Análisis con IA)

**Archivo**: `src/server/gemini/analyzers/email-analyzer.ts`

```typescript
export async function analyzeEmailWithGemini(
  email: ParsedEmail,
  context?: any
): Promise<EmailAnalysisResult> {
  try {
    // TODO: Llamar a Gemini API ❌
    // const response = await geminiClient.generateContent(prompt);
    
    // Por ahora, análisis basado en reglas + mock Gemini response
    const analysis = await analyzeWithRulesAndMockAI(email, context);
    
    return analysis;
  } catch (error) {
    // Fallback: análisis básico sin IA
    return await analyzeWithRulesAndMockAI(email, context);
  }
}
```

**Problemas**:
- ❌ **NO llama a Gemini API real**: Solo usa reglas keywords
- ❌ El análisis es muy básico (busca palabras clave)
- ⚠️ No aprovecha capacidades de LLM para contexto complejo

**Análisis basado en reglas**:
```typescript
function classifyDepartment(text: string): Department {
  if (text.includes('cotiz') || text.includes('precio')) return 'VENTAS';
  if (text.includes('envío') || text.includes('stock')) return 'ALMACEN';
  if (text.includes('calidad') || text.includes('certificado')) return 'CALIDAD';
  // ... más reglas simples
}
```

### 3. Intelligence Hub (Orquestador)

**Archivo**: `src/server/gemini/intelligence-hub.ts`

La función `processEmailWithIntelligence()` SÍ implementa correctamente:

✅ Análisis con Gemini  
✅ Creación de Interaction  
✅ **Creación de Alert** si es urgente/high priority  
✅ Creación de Task si requiere acción  
✅ Análisis de attachments  
✅ Acciones sugeridas en alertas

```typescript
// 3. CREAR ALERT SI ES URGENTE O HIGH PRIORITY
const shouldCreateAlert = 
  (emailAnalysis.priority === 'urgent' || emailAnalysis.priority === 'high') &&
  context.preferences?.autoCreateAlerts !== false;

if (shouldCreateAlert) {
  const alertSeverity = emailAnalysis.priority === 'urgent' ? 'CRITICAL' : 'HIGH';
  
  const alert = await createAlert({
    type: 'EMAIL_URGENT',
    severity: alertSeverity,
    title: `📧 Email ${emailAnalysis.priority}: ${email.subject}`,
    message: `De: ${email.from}\n\n${email.body.substring(0, 300)}`,
    userId: context.userId,
    department: emailAnalysis.department,
    actionable: true,
    suggestedActions: [
      {
        label: 'Responder email',
        action: 'SEND_EMAIL',
        params: { to: email.from, subject: `Re: ${email.subject}` },
      },
      {
        label: 'Crear tarea',
        action: 'CREATE_TASK',
        params: { title: `Responder: ${email.subject}`, priority: alertSeverity },
      },
    ],
    // ...
  });
}
```

**Pero**:
- ❌ **NO se está usando**: Gmail Sync no llama a esta función
- ❌ Las alertas nunca se crean porque no se ejecuta este código

---

## 🔧 PROBLEMAS ESPECÍFICOS

### Problema 1: Gmail Sync no usa Intelligence Hub

**Ubicación**: `src/server/integrations/gmail/sync.ts` línea ~240

**Código actual**:
```typescript
// Analizar email con IA
const analysis = await this.analyzeEmail(email);

// Crear interacción con departamento y análisis
const interaction: Interaction = { /* ... */ };
await db.collection('interactions').doc(interaction.id).set(interaction);

// Si requiere acción, crear tarea (opcional)
if (analysis?.requiresAction) {
  await this.createTaskFromEmail(interaction, analysis);
}
```

**Debería ser**:
```typescript
// Procesar con Intelligence Hub (incluye alertas + tasks)
const result = await processEmailWithIntelligence(email, {
  userId: this.userId,
  preferences: {
    autoCreateTasks: true,
    autoCreateAlerts: true,
    minPriorityForAlert: 'HIGH',
  },
});
```

### Problema 2: Email Analyzer no usa Gemini API

**Ubicación**: `src/server/gemini/analyzers/email-analyzer.ts` línea ~38

**Código actual**:
```typescript
try {
  // TODO: Llamar a Gemini API
  // const response = await geminiClient.generateContent(prompt);
  // const analysis = parseGeminiResponse(response);
  
  // Por ahora, análisis basado en reglas + mock Gemini response
  const analysis = await analyzeWithRulesAndMockAI(email, context);
  return analysis;
}
```

**Impacto**:
- El análisis es muy básico (solo busca keywords)
- No entiende contexto complejo
- No puede analizar sentimiento real
- No extrae entidades de forma inteligente

### Problema 3: Lógica duplicada de tareas

**En Gmail Sync** (`sync.ts` línea ~380):
```typescript
private async createTaskFromEmail(
  interaction: Interaction,
  analysis: any
): Promise<void> {
  const task = {
    kind: 'INTERACTION',
    title: `📧 ${interaction.title || 'Email sin asunto'}`,
    // ...
  };
  await db.collection('tasks').add(task);
}
```

**En Intelligence Hub** (`intelligence-hub.ts` línea ~150):
```typescript
if (shouldCreateTask) {
  const task = await createTask({
    kind: 'INTERACTION',
    title: `📧 ${email.subject}`,
    // ... (lógica similar pero más completa)
  });
}
```

**Problema**: Dos implementaciones diferentes que pueden divergir.

---

## 🎯 RECOMENDACIONES

### 1. URGENTE: Conectar Gmail Sync con Intelligence Hub

**Prioridad**: 🔴 CRÍTICA

**Acción**:
```typescript
// src/server/integrations/gmail/sync.ts

import { processEmailWithIntelligence } from '@/server/gemini/intelligence-hub';

private async processEmail(email: ParsedEmail): Promise<void> {
  // Verificar si ya existe
  const existingId = `gmail_${email.messageId}`;
  const existing = await db.collection('interactions').doc(existingId).get();
  if (existing.exists) return;

  // ✅ USAR INTELLIGENCE HUB
  const result = await processEmailWithIntelligence(email, {
    userId: this.userId,
    accountHistory: [], // TODO: obtener del account
    preferences: {
      autoCreateTasks: true,
      autoCreateAlerts: true,
      minPriorityForTask: 'MEDIUM',
      minPriorityForAlert: 'HIGH',
    },
  });
  
  console.log('[Gmail Sync] Intelligence Hub result:', {
    success: result.success,
    actionsTaken: result.actionsTaken.length,
  });
}
```

**Beneficios**:
- ✅ Alertas se crean automáticamente
- ✅ Tasks se crean con acciones sugeridas
- ✅ Código centralizado y mantenible
- ✅ Análisis más completo

### 2. IMPORTANTE: Implementar llamada real a Gemini API

**Prioridad**: 🟡 ALTA

**Acción**:
```typescript
// src/server/gemini/analyzers/email-analyzer.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeEmailWithGemini(
  email: ParsedEmail,
  context?: any
): Promise<EmailAnalysisResult> {
  
  try {
    // ✅ Llamar a Gemini API REAL
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = buildEmailAnalysisPrompt(email, context);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parsear respuesta JSON
    const analysis = JSON.parse(text);
    
    return {
      department: analysis.department,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      category: analysis.category,
      requiresAction: analysis.requiresAction,
      actionItems: analysis.actionItems,
      relatedEntities: analysis.entities,
      suggestedAssignee: analysis.suggestedAssignee,
      suggestedDueDate: analysis.suggestedDueDate,
    };
    
  } catch (error) {
    console.error('[Email Analyzer] Error calling Gemini:', error);
    // Fallback a análisis basado en reglas
    return await analyzeWithRulesAndMockAI(email, context);
  }
}
```

### 3. Eliminar código duplicado

**Prioridad**: 🟢 MEDIA

**Acción**:
- Eliminar `createTaskFromEmail()` de `gmail/sync.ts`
- Eliminar `analyzeEmail()` privado de `gmail/sync.ts`
- Usar solo las funciones del Intelligence Hub

### 4. Mejorar prompt de Gemini

**Prioridad**: 🟢 MEDIA

El prompt actual es bueno pero puede mejorarse:

```typescript
function buildEmailAnalysisPrompt(email: ParsedEmail, context?: any): string {
  return `
Eres un asistente de IA especializado en clasificar emails para un ERP de distribución 
de productos de higiene profesional (Santa Brisa).

CONTEXTO DE LA EMPRESA:
- Productos: Químicos de limpieza, higiene profesional
- Clientes: Hoteles, restaurantes, empresas de limpieza
- Departamentos: VENTAS, ALMACEN, CALIDAD, FINANZAS, MARKETING, PRODUCCION

EMAIL A ANALIZAR:
De: ${email.from}
Asunto: ${email.subject}
Fecha: ${email.date}
Cuerpo:
${email.body}

${context?.recentOrders?.length ? `
HISTORIAL DEL CLIENTE:
- Pedidos recientes: ${context.recentOrders.length}
- Última interacción: ${context.recentInteractions?.[0]?.date}
` : ''}

TAREA:
Analiza el email y devuelve un JSON con esta estructura exacta:

{
  "department": "VENTAS|ALMACEN|CALIDAD|FINANZAS|MARKETING|PRODUCCION|OPS",
  "priority": "urgent|high|medium|low",
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.5,
  "category": "prospection|support|complaint|order|general",
  "requiresAction": true,
  "actionItems": ["acción específica 1", "acción 2"],
  "entities": {
    "orders": ["#1234"],
    "products": ["SKU-001"],
    "amounts": ["100 units"]
  },
  "suggestedDueDate": "2025-01-23T10:00:00Z",
  "summary": "Resumen en 1 línea"
}

REGLAS:
1. Si menciona precios, cotizaciones → VENTAS
2. Si menciona stock, envíos → ALMACEN
3. Si menciona certificados, calidad → CALIDAD
4. Si es urgente o tiene "!" → priority: urgent
5. Si es queja o problema → sentiment: negative
6. requiresAction = true si hace pregunta o pide algo

Devuelve SOLO el JSON, sin explicaciones adicionales.
`;
}
```

---

## 🧪 TESTING CON UI DE DESARROLLO

### Página de Testing Disponible

**URL**: `http://localhost:3000/dev/gmail-test`

Esta página proporciona una interfaz completa para probar todas las funcionalidades de Gmail:

#### Funcionalidades Disponibles

1. **Verificar Configuración** 🔍
   - Comprueba si Gmail está configurado para el usuario
   - Muestra estado de OAuth tokens
   - Indica si se requiere autenticación

2. **Enviar Email de Prueba** ✉️
   - Envía un email de test con formato HTML
   - Útil para verificar que el envío funciona
   - Confirma permisos de escritura

3. **Listar Emails** 📬
   - Muestra últimos 20 emails del inbox
   - Filtro para ver solo no leídos
   - Vista previa de contenido

4. **Ver Detalle de Email** 👁️
   - Muestra contenido completo (HTML o texto)
   - Lista attachments
   - Metadata técnica
   - Estado de lectura

5. **Marcar como Leído** ✓
   - Actualiza estado del email
   - Verifica permisos de modificación

6. **Sincronizar Emails** 🔄
   - **Ejecuta el proceso completo de sync**
   - Crea interactions en Firestore
   - **Aquí es donde se deberían crear alertas/tareas**
   - Muestra estadísticas de sync

### Cómo Usar para Testing

#### Setup Inicial

```bash
# 1. Iniciar servidor de desarrollo
npm run dev

# 2. Navegar a la página de testing
open http://localhost:3000/dev/gmail-test
```

#### Flujo de Testing Recomendado

**Paso 1: Verificar Configuración**
```
1. Ingresar userId (ej: "martin")
2. Click en "🔍 Verificar Config"
3. Si no está configurado → Click en "🔗 Conectar Cuenta de Gmail"
4. Completar flujo OAuth de Google
```

**Paso 2: Probar Lectura**
```
1. Click en "📬 Todos los Emails"
2. Verificar que se listan emails
3. Click en "👁️ Ver" en algún email
4. Revisar que se muestre contenido completo
```

**Paso 3: Probar Envío**
```
1. Click en "✉️ Enviar Test"
2. Verificar mensaje de éxito
3. Revisar email recibido en inbox
```

**Paso 4: Probar Sync (CRÍTICO)**
```
1. Click en "🔄 Sync Emails"
2. Verificar respuesta:
   {
     "success": true,
     "synced": 5,
     "errors": 0
   }
3. ⚠️ IMPORTANTE: Abrir consola del navegador
4. Buscar logs de Intelligence Hub
5. Verificar si se crearon alertas/tareas
```

#### Testing Post-Corrección

Una vez implementadas las correcciones de la Fase 1:

**Test 1: Verificar que usa Intelligence Hub**
```javascript
// Buscar en logs del servidor:
[Intelligence Hub] 🧠 Processing email: [asunto]
[Intelligence Hub] ✅ Email analyzed: dept=VENTAS, priority=high
[Intelligence Hub] ✅ Interaction created: [id]
[Intelligence Hub] ✅ Alert created: [id]  // ← DEBE APARECER
[Intelligence Hub] ✅ Task created: [id]   // ← DEBE APARECER
```

**Test 2: Verificar alertas en UI**
```
1. Después de sync, navegar a dashboard principal
2. Verificar widget de alertas (esquina superior derecha)
3. Debe mostrar alerta nueva para email urgente:
   "📧 Email urgent: [asunto del email]"
4. Click en alerta → Ver acciones sugeridas
```

**Test 3: Verificar tareas creadas**
```
1. Navegar a módulo de Tareas
2. Filtrar por fuente: "AUTO_RULE"
3. Debe aparecer tarea:
   "📧 [asunto del email]"
4. Verificar:
   - Prioridad correcta
   - Departamento correcto
   - Due date sugerido
```

### Estados Esperados

#### ❌ Estado Actual (ANTES de correcciones)

Al hacer sync, logs muestran:
```
[Gmail Sync] Email gmail_xxx synced as interaction
[Gmail Sync] Task created: dept=VENTAS, priority=HIGH
```

**Problemas**:
- NO aparece "Intelligence Hub"
- NO se crean alertas
- Task se crea con lógica antigua

#### ✅ Estado Esperado (DESPUÉS de correcciones)

Al hacer sync, logs deben mostrar:
```
[Gmail Sync] Starting sync for user martin
[Intelligence Hub] 🧠 Processing email: Consulta urgente productos
[Intelligence Hub] ✅ Email analyzed: dept=VENTAS, priority=urgent
[Intelligence Hub] ✅ Interaction created: gmail_xxx
[Intelligence Hub] ✅ Alert created: alert_yyy
[Intelligence Hub] ✅ Task created: task_zzz
[Gmail Sync] Intelligence Hub result: { success: true, actionsTaken: 3 }
```

### Debugging Tips

**Si no se crean alertas:**
```typescript
// Verificar en src/server/integrations/gmail/sync.ts
// ¿Llama a processEmailWithIntelligence()?
import { processEmailWithIntelligence } from '@/server/gemini/intelligence-hub';

// ¿Tiene preferencias correctas?
const result = await processEmailWithIntelligence(email, {
  userId: this.userId,
  preferences: {
    autoCreateAlerts: true,  // ← DEBE SER TRUE
    minPriorityForAlert: 'HIGH',
  },
});
```

**Si análisis es muy básico:**
```typescript
// Verificar en src/server/gemini/analyzers/email-analyzer.ts
// ¿Llama a Gemini API o solo usa reglas?
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await model.generateContent(prompt);
// ↑ SI esto falta, solo usa keywords
```

**Ver logs detallados:**
```bash
# En terminal del servidor
# Buscar por estas keywords:
grep "Intelligence Hub" logs/*
grep "processEmailWithIntelligence" logs/*
grep "Alert created" logs/*
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Conexión con Intelligence Hub (2-3 horas)
- [ ] Modificar `gmail/sync.ts` para usar `processEmailWithIntelligence()`
- [ ] Eliminar `createTaskFromEmail()` de `sync.ts`
- [ ] Eliminar `analyzeEmail()` privado de `sync.ts`
- [ ] Probar con emails de prueba
- [ ] Verificar que se crean alertas para emails urgentes

### Fase 2: Implementar Gemini API real (3-4 horas)
- [ ] Añadir llamada real a Gemini en `email-analyzer.ts`
- [ ] Mejorar prompt de análisis
- [ ] Implementar parsing robusto de respuesta JSON
- [ ] Añadir retry logic y manejo de errores
- [ ] Probar con diferentes tipos de emails

### Fase 3: Testing y Validación (2 horas)
- [ ] Crear suite de emails de prueba
- [ ] Verificar clasificación de departamentos
- [ ] Verificar creación de alertas
- [ ] Verificar creación de tareas
- [ ] Validar acciones sugeridas

### Fase 4: Monitoreo y Ajustes (ongoing)
- [ ] Añadir logs detallados
- [ ] Crear dashboard de análisis
- [ ] Ajustar umbrales de prioridad
- [ ] Recopilar feedback de usuarios

---

## 🎓 CONCLUSIONES

### Estado Actual
- ⚠️ **Parcialmente funcional**: Los emails se procesan pero sin aprovechar el Intelligence Hub
- ❌ **Alertas no funcionan**: Los emails urgentes no generan alertas automáticas
- ⚠️ **IA básica**: Solo usa reglas keywords, no Gemini API real

### Impacto en Usuarios
- Los usuarios NO reciben alertas de emails urgentes
- Las tareas se crean pero sin acciones sugeridas
- El análisis es muy básico (puede fallar en casos complejos)
- Se pierde la oportunidad de análisis contextual con IA

### Esfuerzo de Corrección
- **Tiempo estimado**: 7-9 horas
- **Complejidad**: Media
- **Riesgo**: Bajo (cambios bien acotados)
- **Beneficio**: ALTO (funcionalidad crítica del sistema)

### Prioridad Recomendada
🔴 **ALTA** - Implementar Fase 1 lo antes posible para activar alertas automáticas

---

## 📚 Referencias

- `src/server/integrations/gmail/sync.ts` - Gmail Sync Service
- `src/server/gemini/analyzers/email-analyzer.ts` - Email Analyzer
- `src/server/gemini/intelligence-hub.ts` - Intelligence Hub Orchestrator
- `src/server/actions/alerts.actions.ts` - Alert Actions
- `FASE_FINAL_2_GEMINI_ORCHESTRATOR_COMPLETE.md` - Documentación del orchestrator

---

**Auditoría completada**: 20/01/2025  
**Próxima revisión**: Después de implementar Fase 1
