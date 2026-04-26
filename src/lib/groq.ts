const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function callGroq(prompt: string): Promise<unknown> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no está configurado en .env.local');

  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message || `Groq error ${r.status}`);
  }

  const data = (await r.json()) as { choices: [{ message: { content: string } }] };
  return JSON.parse(data.choices[0].message.content);
}
