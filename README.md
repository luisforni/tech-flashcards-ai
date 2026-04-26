# Tech Flashcards AI

Plataforma de flashcards para preparación de entrevistas técnicas. Incluye tarjetas precargadas para los stacks más demandados y generación dinámica de contenido mediante IA para cualquier tecnología.

## Características

- **5 tecnologías precargadas** — Django, FastAPI, Python, Docker y GenAI con más de 300 tarjetas curadas
- **Generación con IA** — cualquier tecnología bajo demanda usando Groq (llama-3.3-70b-versatile), sin costo
- **Profundizar** — explicación ampliada de cualquier tarjeta directamente en la sesión
- **Filtros por categoría** — navegar por nivel o área temática dentro de cada deck
- **Sesiones persistentes** — los temas generados se guardan en localStorage y aparecen en el hub
- **Atajos de teclado** — espacio para revelar, 1/2/3 para marcar

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + CSS custom properties |
| IA | Groq API — `llama-3.3-70b-versatile` |
| Fuentes | Syne + JetBrains Mono (Google Fonts) |
| Deploy | Vercel |

## Primeros pasos

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/luisforni/tech-flashcards-ai.git
cd tech-flashcards-ai
npm install
```

### 2. Configurar la API key de Groq

Crear `.env.local` en la raíz del proyecto:

```env
GROQ_API_KEY=tu_clave_aqui
```

La clave se obtiene gratis en [console.groq.com](https://console.groq.com).

### 3. Levantar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Estructura del proyecto

```
tech-flashcards-ai/
├── data/                   # JSON con tarjetas precargadas (leído solo en servidor)
│   ├── topics.json         # Metadatos de los 5 temas
│   ├── django.json
│   ├── fastapi.json
│   ├── python.json
│   ├── docker.json
│   └── genai.json
├── scripts/
│   └── extract.py          # Extrae tarjetas de los HTML originales a JSON
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout — fuentes y metadata
│   │   ├── page.tsx        # Hub principal (Server Component)
│   │   ├── globals.css     # Design system completo
│   │   ├── [topic]/
│   │   │   └── page.tsx    # Página de deck por topic (Server Component)
│   │   └── api/
│   │       ├── generate/route.ts   # POST /api/generate — genera tarjetas con IA
│   │       └── deepen/route.ts     # POST /api/deepen — profundiza una tarjeta
│   ├── components/
│   │   ├── FlashcardDeck.tsx       # Deck interactivo completo (Client Component)
│   │   └── HubClient.tsx           # Hub con búsqueda y temas generados (Client Component)
│   ├── lib/
│   │   ├── groq.ts                 # Cliente HTTP para la API de Groq
│   │   └── topics.ts               # Lee los JSON de data/ con fs (solo servidor)
│   └── types.ts                    # Interfaces TypeScript compartidas
└── .env.local                      # Variables de entorno (no incluido en el repo)
```

## Temas disponibles

| Tema | Tarjetas | Cobertura |
|------|---------|-----------|
| Django | 60 | ORM, vistas, auth, admin, REST, migraciones |
| FastAPI | 68 | Routes, Pydantic, async/await, dependencias, OpenAPI |
| Python | 69 | Tipos, iteradores, decoradores, GIL, concurrencia |
| Docker | 64 | Images, containers, Compose, redes, volúmenes |
| GenAI | 75 | LLMs, RAG, embeddings, fine-tuning, prompting |

Para generar flashcards de cualquier otra tecnología, usar el campo de texto del hub.

## Deploy en Vercel

```bash
vercel --prod
```

Agregar `GROQ_API_KEY` en las variables de entorno del proyecto en el dashboard de Vercel.
