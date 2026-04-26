'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TopicMeta } from '@/types';

const LS_KEY = 'tf_generated_topics_meta';

interface Props {
  builtinTopics: TopicMeta[];
}

export default function HubClient({ builtinTopics }: Props) {
  const [generatedTopics, setGeneratedTopics] = useState<TopicMeta[]>([]);
  const [search, setSearch] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setGeneratedTopics(JSON.parse(raw));
    } catch {}
  }, []);

  const allTopics: TopicMeta[] = [
    ...builtinTopics.map(t => ({ ...t, source: 'builtin' as const })),
    ...generatedTopics.map(t => ({ ...t, source: 'generated' as const })),
  ];

  const filtered = search.trim()
    ? allTopics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      )
    : allTopics;

  function goGenerate() {
    const val = newTopic.trim().toLowerCase();
    if (!val) return;
    window.location.href = `/${encodeURIComponent(val)}?generate=true`;
  }

  return (
    <>
      <input
        className="search-input"
        type="text"
        placeholder="buscar tecnología..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
      />

      <div className="section-label">tecnologías disponibles</div>
      <div className="topics-grid">
        {filtered.length === 0 && (
          <p className="no-results">Sin resultados.</p>
        )}
        {filtered.map(t => (
          <Link key={t.id} href={`/${t.id}`} className="topic-card">
            <div className="topic-icon">{t.icon}</div>
            <div className="topic-title">{t.title}</div>
            <div className="topic-desc">{t.description}</div>
            <div className="topic-footer">
              <span className="topic-count">{t.count} cards</span>
              {t.source === 'generated' && (
                <span className="topic-badge">AI</span>
              )}
              <span className="topic-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="generate-box">
        <div className="generate-label">✦ generate with AI</div>
        <div className="generate-title">¿No encontrás la tecnología?</div>
        <div className="generate-sub">Generá flashcards para cualquier stack con IA en segundos.</div>
        <div className="generate-row">
          <input
            type="text"
            className="generate-input"
            placeholder="kubernetes, celery, redis, sqlalchemy..."
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goGenerate()}
            autoComplete="off"
          />
          <button className="btn-generate" onClick={goGenerate}>Generar →</button>
        </div>
      </div>
    </>
  );
}
