# Arquitectura — Tech Flashcards AI

## Visión general

La aplicación usa **Next.js 14 App Router** con una separación clara entre código de servidor y de cliente. Los datos precargados se leen desde el sistema de archivos en el servidor; la IA se invoca desde API Routes del servidor para que la clave nunca llegue al browser.

```
Browser                  Next.js Server              Groq API
  │                           │                          │
  │── GET /django ────────────▶ TopicPage (RSC)          │
  │                           │ lee data/django.json     │
  │◀─ HTML + FlashcardDeck ───│                          │
  │                           │                          │
  │── POST /api/generate ─────▶ route.ts                 │
  │                           │── POST /v1/chat ─────────▶
  │                           │◀─ { cards: [...] } ──────│
  │◀─ { cards: [...] } ───────│                          │
```

---

## Flujo completo: el usuario hace clic en "Generar"

### 1. El usuario escribe un tema y hace clic en "Generar →" en el hub

**Archivo:** [src/components/HubClient.tsx](src/components/HubClient.tsx)

```
función goGenerate()
  └── lee el valor del input (ej: "kubernetes")
  └── redirige a /{topic}?generate=true
```

`HubClient` es un Client Component. La redirección via `window.location.href` navega a la ruta dinámica con el query param `generate=true`.

---

### 2. Next.js renderiza la página del topic en el servidor

**Archivo:** [src/app/[topic]/page.tsx](src/app/%5Btopic%5D/page.tsx)

```
TopicPage (Server Component, async)
  ├── await params  → topic = "kubernetes"
  ├── await searchParams → forceGenerate = true
  ├── forceGenerate === true → builtinData = null  (saltea la lectura de disco)
  └── renderiza <FlashcardDeck topic="kubernetes" builtinData={null} forceGenerate={true} />
```

Si `forceGenerate` es `false` y el tema existe en `data/`, llama a `getTopicData(topic)` y pasa los datos al componente. El servidor nunca expone la API key al HTML generado.

---

### 3. `getTopicData` lee el JSON desde disco

**Archivo:** [src/lib/topics.ts](src/lib/topics.ts)

#### `getTopicsMeta(): TopicMeta[]`
Lee `data/topics.json` y devuelve el array de metadatos para el hub. Retorna `[]` si el archivo no existe.

#### `getTopicData(topic: string): TopicData | null`
Lee `data/{topic}.json` con `fs.readFileSync`. Retorna `null` si el topic no existe (topic generado por IA o desconocido).

Ambas funciones solo pueden ejecutarse en el servidor porque usan `fs` de Node.js.

---

### 4. El cliente hidrata `FlashcardDeck` y detecta el estado inicial

**Archivo:** [src/components/FlashcardDeck.tsx](src/components/FlashcardDeck.tsx)

`FlashcardDeck` es un Client Component (`'use client'`). Recibe tres props:

| Prop | Tipo | Descripción |
|------|------|-------------|
| `topic` | `string` | Identificador del tema, ej: `"kubernetes"` |
| `builtinData` | `TopicData \| null` | Datos precargados o `null` |
| `forceGenerate` | `boolean` | Si es `true`, ignora localStorage y muestra pantalla de generación |

**Estado inicial:**

```typescript
useState<AppState>((builtinData && !forceGenerate) ? 'playing' : 'generate')
```

Con `builtinData = null` y `forceGenerate = true`, el estado inicial es `'generate'` → se renderiza la pantalla "Generar flashcards".

**`useEffect` de inicialización:**

```
si builtinData existe y !forceGenerate
  └── startPlay(builtinData.cards)
si builtinData es null y !forceGenerate
  └── busca en localStorage la key tf_topic_{topic}
      └── si existe, startPlay(saved.cards)  ← deck generado previamente
```

---

### 5. El usuario hace clic en "Generar flashcards →"

**Función:** `generate()` en [src/components/FlashcardDeck.tsx](src/components/FlashcardDeck.tsx)

```
generate()
  ├── setState('generating')  → muestra spinner
  ├── POST /api/generate  { topic: "kubernetes", count: 30 }
  │     └── espera respuesta del servidor
  ├── recibe { cards: [{cat, q, a}, ...] }
  ├── construye TopicData completo
  ├── saveGeneratedToLS(newTopicData)
  │     ├── escribe tf_generated_topics_meta en localStorage  ← hub lo lee al volver
  │     └── escribe tf_topic_kubernetes en localStorage       ← reutilizable sin regenerar
  └── startPlay(data.cards)  → setState('playing')
```

---

### 6. La API Route llama a Groq en el servidor

**Archivo:** [src/app/api/generate/route.ts](src/app/api/generate/route.ts)

```
POST /api/generate
  ├── valida que exista topic en el body
  ├── construye prompt en inglés con instrucción de responder en español
  └── llama callGroq(prompt)
```

**Archivo:** [src/lib/groq.ts](src/lib/groq.ts)

#### `callGroq(prompt: string): Promise<unknown>`

```
callGroq(prompt)
  ├── lee process.env.GROQ_API_KEY  ← solo disponible en servidor
  ├── POST https://api.groq.com/openai/v1/chat/completions
  │     model: "llama-3.3-70b-versatile"
  │     response_format: { type: "json_object" }
  │     temperature: 0.7
  │     max_tokens: 4096
  └── parsea choices[0].message.content como JSON
      └── retorna { cards: [{cat, q, a}, ...] }
```

La API key nunca sale del servidor. El browser solo ve el JSON de respuesta.

---

### 7. El deck entra en modo de juego

**Función:** `startPlay(rawCards: Card[])` en [src/components/FlashcardDeck.tsx](src/components/FlashcardDeck.tsx)

```
startPlay(cards)
  ├── extrae categorías únicas → ["Todas", "Básico", "Avanzado", ...]
  ├── shuffle(cards)  ← Fisher-Yates simplificado con Math.random()
  ├── resetea contadores: idx=0, correct=0, skip=0, wrong=0
  └── setState('playing')
```

---

### 8. Ciclo de una tarjeta

```
Estado: 'playing'
  │
  ├── el usuario ve la pregunta (card.q renderizado con dangerouslySetInnerHTML)
  ├── click / Space / ArrowDown → revealAnswer() → revealed = true
  ├── se muestra card.a
  └── el usuario presiona un botón o tecla:
        ├── "✓ Lo sé" / tecla 1 → mark('correct')
        ├── "~ Repasar" / tecla 2 → mark('skip')
        └── "✗ No sé" / tecla 3 → mark('wrong')
              └── idx++
                    └── si idx >= cards.length → setState('done')
```

---

### 9. Función "Profundizar"

**Función:** `deepen()` en [src/components/FlashcardDeck.tsx](src/components/FlashcardDeck.tsx)

```
deepen()
  ├── abre deepen-panel (CSS transition max-height)
  ├── POST /api/deepen  { topic, question: card.q, answer: card.a }
  └── muestra explanation como HTML dentro del panel
```

**Archivo:** [src/app/api/deepen/route.ts](src/app/api/deepen/route.ts)

```
POST /api/deepen
  ├── valida question y answer
  ├── construye prompt pidiendo: más detalle, ejemplo, errores comunes, alternativas
  └── callGroq(prompt) → { explanation: "<html>" }
```

---

### 10. Persistencia de temas generados

**Función:** `saveGeneratedToLS(data: TopicData)` en [src/components/FlashcardDeck.tsx](src/components/FlashcardDeck.tsx)

```
localStorage
  ├── tf_generated_topics_meta  →  TopicMeta[]   (leído por HubClient al cargar el hub)
  └── tf_topic_{topic}          →  TopicData     (leído por FlashcardDeck al re-visitar el tema)
```

**Archivo:** [src/components/HubClient.tsx](src/components/HubClient.tsx)

```
HubClient  (Client Component)
  ├── useEffect: lee tf_generated_topics_meta de localStorage
  ├── merge: [...builtinTopics, ...generatedTopics]
  └── renderiza el grid con badge "AI" en los topics generados
```

---

## Tipos compartidos

**Archivo:** [src/types.ts](src/types.ts)

| Interfaz | Descripción |
|----------|-------------|
| `Card` | `{ cat: string; q: string; a: string }` — una tarjeta |
| `TopicData` | Topic completo con su array de cards |
| `TopicMeta` | Versión liviana para el hub: sin cards, solo metadatos |

---

## Design system

**Archivo:** [src/app/globals.css](src/app/globals.css)

Variables CSS definidas en `:root`:

| Variable | Valor | Uso |
|----------|-------|-----|
| `--bg` | `#0a0a0f` | Fondo principal |
| `--surface` | `#111118` | Superficies secundarias |
| `--card-bg` | `#16161f` | Fondo de tarjetas |
| `--accent` | `#00e5a0` | Verde principal, correcto |
| `--accent2` | `#7c6fff` | Violeta secundario |
| `--correct` | `#00e5a0` | Marcador "lo sé" |
| `--skip` | `#f0c040` | Marcador "repasar" |
| `--wrong` | `#ff5f7e` | Marcador "no sé" |

Fuentes cargadas via `next/font/google` y expuestas como variables CSS `--font-syne` y `--font-mono`.

---

## Scripts

**Archivo:** [scripts/extract.py](scripts/extract.py)

Script de uso único que parsea los archivos HTML originales (con los objetos JS `{ cat, q, a }`) usando regex y genera los JSON en `data/`. No es parte del runtime de la app.
