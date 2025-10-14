// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Convertir audio a base64
    const bytes = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(bytes).toString('base64');

    // Gemini 2.0 Flash con audio nativo
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: audioBase64
        }
      },
      { 
        text: 'Transcribe este audio a texto en español. Responde SOLO con el texto transcrito, sin explicaciones ni formato adicional.' 
      }
    ]);

    const text = result.response.text().trim();

    return NextResponse.json({ 
      text,
      transcript: text, // Compatibilidad
      success: true 
    });

  } catch (error: any) {
    console.error('Error transcribing audio with Gemini:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error transcribing audio',
        success: false 
      },
      { status: 500 }
    );
  }
}
