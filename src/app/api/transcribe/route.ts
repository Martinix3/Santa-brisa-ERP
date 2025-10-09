// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file uploaded.' },
        { status: 400 }
      );
    }

    // Convertir audio a base64 para Gemini
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Usar Gemini para transcripción
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio
        }
      },
      "Transcribe este audio a texto en español. Devuelve SOLO el texto transcrito, sin explicaciones adicionales."
    ]);

    const transcript = result.response.text().trim();

    return NextResponse.json({ 
      transcript 
    });

  } catch (error: any) {
    console.error('Error transcribing audio with Gemini:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio.', details: error.message },
      { status: 500 }
    );
  }
}
