// Test Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  console.log('🧪 Testing Gemini API...\n');
  
  // 1. Verificar API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY no está configurada en .env.local');
    console.log('\n📝 Agrégala así:');
    console.log('GEMINI_API_KEY=tu_api_key_aqui\n');
    process.exit(1);
  }
  
  console.log('✅ GEMINI_API_KEY encontrada');
  console.log(`   Longitud: ${apiKey.length} caracteres\n`);
  
  // 2. Test básico
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('🚀 Enviando test request...');
    const startTime = Date.now();
    
    const result = await model.generateContent('Di "hola" en español');
    const response = result.response.text();
    
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Respuesta recibida en ${elapsed}ms`);
    console.log(`   Respuesta: ${response}\n`);
    
    // 3. Test con prompt estructurado (como en QuickLog)
    console.log('🧠 Testing prompt estructurado...');
    const structuredPrompt = `
Analiza este texto de nota de voz y extrae información estructurada:

"Fui al 4 Gatos y me pidieron 3 cajas de Santa Brisa"

Responde en formato JSON:
{
  "cuenta": "nombre de la cuenta",
  "accion": "VISITA" | "PEDIDO" | "EVENTO",
  "detalles": {}
}
`;
    
    const structuredResult = await model.generateContent(structuredPrompt);
    const structuredResponse = structuredResult.response.text();
    
    console.log('✅ Respuesta estructurada:');
    console.log(structuredResponse);
    
    console.log('\n✅ ¡Gemini API funciona correctamente!');
    
  } catch (error: any) {
    console.error('\n❌ Error al conectar con Gemini:');
    console.error(error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Parece que la API key no es válida');
      console.log('   Verifica en: https://aistudio.google.com/app/apikey');
    }
    
    process.exit(1);
  }
}

testGemini();
