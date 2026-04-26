import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';

export async function POST(req: NextRequest) {
  const { topic, question, answer } = await req.json();
  if (!question || !answer) {
    return NextResponse.json({ error: 'question y answer requeridos' }, { status: 400 });
  }

  const prompt = `Explicá en profundidad este concepto para preparación de entrevista técnica.

Tema: ${topic || 'general'}
Pregunta: ${question}
Respuesta básica: ${answer}

Explicación en español cubriendo:
1. Más detalle sobre el concepto y cómo funciona internamente
2. Ejemplo concreto y práctico
3. Errores comunes o edge cases
4. Cuándo usarlo vs alternativas (si aplica)

Formato HTML con <b>, <code>, <ul>, <li> donde corresponda. Apuntá a 150-300 palabras.
Devolvé JSON: { "explanation": "<contenido html>" }`;

  try {
    const data = await callGroq(prompt);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
