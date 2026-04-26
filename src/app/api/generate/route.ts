import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';

export async function POST(req: NextRequest) {
  const { topic, count = 30 } = await req.json();
  if (!topic) return NextResponse.json({ error: 'topic requerido' }, { status: 400 });

  const prompt = `Generate ${count} technical interview flashcards for "${topic}".
Write all questions and answers in Spanish.
Return JSON with a "cards" array. Each card must have:
- "cat": category string (group by topic area, e.g. "Básico", "Avanzado", "Performance")
- "q": interview question (use <code> tags for inline code)
- "a": concise but complete answer (2-5 sentences, use <code> for code, <b> for key terms)

Cover: fundamentals, core concepts, common patterns, advanced topics, best practices, gotchas.
Make questions realistic for a technical interview.`;

  try {
    const data = await callGroq(prompt);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
