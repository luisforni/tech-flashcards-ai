#!/usr/bin/env python3
"""Extract flashcard data from HTML files and write to data/*.json"""
import re, json, os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

SOURCES = [
    ('django',  '/home/lf/Descargas/django-flashcards.html',      'Django',   '🐍', 'ORM, vistas, autenticación, admin, REST'),
    ('fastapi', '/home/lf/Descargas/fastapi-flashcards.html',     'FastAPI',  '⚡', 'Routes, Pydantic, async, dependencias, OpenAPI'),
    ('python',  '/home/lf/Descargas/python-flashcards-v2.html',   'Python',   '🐍', 'Tipos, iteradores, decoradores, GIL, concurrencia'),
    ('docker',  '/home/lf/Descargas/docker-flashcards.html',      'Docker',   '🐳', 'Images, containers, Compose, redes, volúmenes'),
    ('genai',   '/home/lf/Descargas/genai-flashcards.html',       'GenAI',    '🤖', 'LLMs, RAG, embeddings, fine-tuning, prompting'),
]

# Match JS object literals: { cat: "...", q: "...", a: "..." }
# Using a two-pass approach: grab everything between the first [ and last ] of the cards array
CARD_RE = re.compile(
    r'\{\s*cat:\s*"((?:[^"\\]|\\.)*)"\s*,\s*q:\s*"((?:[^"\\]|\\.)*)"\s*,\s*a:\s*"((?:[^"\\]|\\.)*)"\s*\}',
    re.DOTALL
)

topics_meta = []

for topic_id, src_path, title, icon, description in SOURCES:
    with open(src_path, encoding='utf-8') as f:
        html = f.read()

    cards = []
    for m in CARD_RE.finditer(html):
        cat = m.group(1).replace('\\"', '"').replace("\\'", "'")
        q   = m.group(2).replace('\\"', '"').replace("\\'", "'")
        a   = m.group(3).replace('\\"', '"').replace("\\'", "'")
        cards.append({'cat': cat, 'q': q, 'a': a})

    print(f'{topic_id}: {len(cards)} cards')

    topic_data = {
        'topic': topic_id,
        'title': title,
        'icon': icon,
        'description': description,
        'cards': cards,
    }
    out_path = os.path.join(DATA_DIR, f'{topic_id}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(topic_data, f, ensure_ascii=False, indent=2)

    topics_meta.append({
        'id': topic_id,
        'title': title,
        'icon': icon,
        'description': description,
        'count': len(cards),
    })

meta_path = os.path.join(DATA_DIR, 'topics.json')
with open(meta_path, 'w', encoding='utf-8') as f:
    json.dump(topics_meta, f, ensure_ascii=False, indent=2)

print(f'\nWrote {meta_path}')
