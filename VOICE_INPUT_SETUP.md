# 🎤 Sistema de Entrada por Voz - Santa Brain

## Descripción

Sistema completo de entrada por voz que permite a los comerciales registrar actividades hablando naturalmente. El sistema:

1. **Graba** el audio del micrófono
2. **Transcribe** usando OpenAI Whisper (Speech-to-Text)
3. **Procesa** con Gemini AI para extraer información estructurada
4. **Presenta** una confirmación editable antes de guardar

## 🔧 Configuración

### 1. API Keys Necesarias

Añade estas claves en tu archivo `.env.local`:

```env
# OpenAI - Para transcripción de voz
OPENAI_API_KEY=sk-...

# Google Gemini - Ya configurado para Santa Brain
GEMINI_API_KEY=...
```

#### Obtener OpenAI API Key:
1. Ve a https://platform.openai.com/api-keys
2. Crea una cuenta o inicia sesión
3. Click en "Create new secret key"
4. Copia la key y pégala en `.env.local`
5. **Importante**: Necesitas saldo en tu cuenta de OpenAI

#### Gemini API Key:
Ya debería estar configurada. Si no:
1. Ve a https://makersuite.google.com/app/apikey
2. Crea un proyecto en Google Cloud
3. Obtén tu API key
4. Añádela a `.env.local`

### 2. Instalar Dependencias

```bash
npm install openai
```

(Ya instalado en el proyecto)

## 🎯 Componentes Implementados

### Backend (API Routes)

**`/api/transcribe`** - Transcripción de audio
- Recibe: archivo de audio (webm)
- Usa: OpenAI Whisper
- Devuelve: texto transcrito en español

**`/api/process-note`** - Procesamiento inteligente
- Recibe: texto transcrito
- Usa: Gemini AI con prompt especializado
- Devuelve: datos estructurados en JSON

### Frontend (Componentes)

**`VoiceRecorder`** - Componente de grabación
```tsx
import { VoiceRecorder } from '@/features/quicklog/components/VoiceRecorder';

<VoiceRecorder onNewData={(data) => handleVoiceData(data)} />
```

**`SantaBrainConfirmation`** - Confirmación editable
```tsx
import { SantaBrainConfirmation } from '@/features/quicklog/components/SantaBrainConfirmation';

<SantaBrainConfirmation
  data={processedData}
  onConfirm={(data) => saveData(data)}
  onCancel={() => cancel()}
/>
```

## 📖 Ejemplos de Uso

### Ejemplo 1: Visita + Pedido

**Usuario dice:**
> "He visitado el Bar El Patio, me han pedido 10 cajas de Margarita Mix para mañana"

**Santa Brain extrae:**
```json
{
  "accountName": "Bar El Patio",
  "isNewAccount": false,
  "actions": [
    {
      "type": "VISITA",
      "date": "2025-01-08",
      "details": { "notes": "Visita realizada" }
    },
    {
      "type": "PEDIDO",
      "date": "2025-01-08",
      "details": {
        "lines": [
          { "product": "Margarita Mix", "quantity": 10, "unit": "cajas" }
        ]
      }
    }
  ]
}
```

### Ejemplo 2: Material POS

**Usuario dice:**
> "Hoy he dejado 2 displays y un cartel en La Taberna Moderna"

**Santa Brain extrae:**
```json
{
  "accountName": "La Taberna Moderna",
  "isNewAccount": false,
  "actions": [
    {
      "type": "POS",
      "date": "2025-01-07",
      "details": {
        "tacticType": "DISPLAY",
        "items": [
          { "name": "Display", "quantity": 2 },
          { "name": "Cartel", "quantity": 1 }
        ]
      }
    }
  ]
}
```

### Ejemplo 3: Cuenta Nueva

**Usuario dice:**
> "He visitado un bar nuevo en la calle Mayor, se llama El Rincón. Quieren 5 cajas para probar"

**Santa Brain extrae:**
```json
{
  "accountName": "El Rincón",
  "isNewAccount": true,
  "actions": [
    {
      "type": "VISITA",
      "date": "2025-01-07",
      "details": { "notes": "Bar nuevo en calle Mayor" }
    },
    {
      "type": "PEDIDO",
      "date": null,
      "details": {
        "lines": [
          { "product": "Producto", "quantity": 5, "unit": "cajas" }
        ],
        "notes": "Pedido de prueba"
      }
    }
  ]
}
```

## 🔄 Flujo Completo

```
Usuario habla
    ↓
[🎤 VoiceRecorder]
    ↓ (audio blob)
/api/transcribe (Whisper)
    ↓ (texto)
/api/process-note (Gemini)
    ↓ (datos estructurados)
[📋 SantaBrainConfirmation]
    ↓ (edición opcional)
Usuario confirma
    ↓
Guardar en Firestore
```

## 🎨 Integración en QuickLog

Para añadir el botón de voz en QuickLog:

```tsx
// En QuickLogDialog.tsx o QuickLogOverlay.tsx
import { VoiceRecorder } from '@/features/quicklog/components/VoiceRecorder';
import { SantaBrainConfirmation } from '@/features/quicklog/components/SantaBrainConfirmation';

function QuickLog() {
  const [voiceData, setVoiceData] = useState(null);

  const handleVoiceData = (data) => {
    setVoiceData(data);
  };

  const handleConfirm = async (data) => {
    // Guardar en Firestore
    await saveAllCollections({
      interactions: data.actions
        .filter(a => a.type === 'VISITA')
        .map(action => ({
          accountId: findAccountId(data.accountName),
          kind: action.type,
          createdAt: action.date || new Date().toISOString(),
          note: action.details.notes
        })),
      ordersSellOut: data.actions
        .filter(a => a.type === 'PEDIDO')
        .map(action => ({
          accountId: findAccountId(data.accountName),
          lines: action.details.lines,
          createdAt: action.date || new Date().toISOString()
        }))
    });
    
    setVoiceData(null);
    toast.success('Datos guardados correctamente');
  };

  return (
    <div>
      {!voiceData ? (
        <VoiceRecorder onNewData={handleVoiceData} />
      ) : (
        <SantaBrainConfirmation
          data={voiceData.structuredData}
          onConfirm={handleConfirm}
          onCancel={() => setVoiceData(null)}
        />
      )}
    </div>
  );
}
```

## 🛠️ Personalización del Prompt

El prompt de Gemini está en `/api/process-note/route.ts`. Puedes personalizarlo para:

- Añadir nuevos tipos de acciones
- Mejorar la detección de productos específicos
- Añadir reglas de negocio específicas
- Mejorar el parsing de fechas

## 📊 Costos Estimados

**OpenAI Whisper:**
- $0.006 por minuto de audio
- Una nota de 30 segundos = ~$0.003

**Gemini Pro:**
- Gratis hasta 60 solicitudes por minuto
- Luego muy económico

**Ejemplo de uso diario:**
- 50 notas de voz de 30s cada una
- Costo total: ~$0.15/día = $4.50/mes

## 🔒 Seguridad

- Las API keys están en variables de entorno (nunca en el frontend)
- El audio se procesa y se descarta (no se almacena)
- Solo se guarda el texto transcrito y los datos estructurados

## 🐛 Troubleshooting

**Error: "No se pudo acceder al micrófono"**
- Verifica que el navegador tenga permisos de micrófono
- Usa HTTPS o localhost (HTTP no funciona para getUserMedia)

**Error: "Failed to transcribe audio"**
- Verifica que OPENAI_API_KEY esté configurada
- Verifica que tengas saldo en tu cuenta de OpenAI

**Error: "Failed to process note"**
- Verifica que GEMINI_API_KEY esté configurada
- Verifica el formato de salida en los logs de Gemini

## 📈 Próximas Mejoras

- [ ] Soporte para múltiples idiomas
- [ ] Caché de transcripciones recientes
- [ ] Modo offline (guardar y procesar después)
- [ ] Búsqueda por voz de cuentas existentes
- [ ] Sugerencias inteligentes basadas en historial
- [ ] Analytics de uso de voz

## 🎯 Mejores Prácticas

1. **Habla claro y pausado**
2. **Menciona el nombre de la cuenta al principio**
3. **Usa frases naturales** ("he visitado", "me han pedido")
4. **Especifica cantidades y productos** ("10 cajas de Margarita Mix")
5. **Menciona fechas relativas** ("mañana", "el viernes")
6. **Revisa siempre** la confirmación antes de guardar

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del navegador (F12 → Console)
2. Revisa los logs del servidor (terminal donde corre Next.js)
3. Verifica las API keys en `.env.local`
4. Prueba con notas de voz simples primero
