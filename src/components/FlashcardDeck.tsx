'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Card, TopicData } from '@/types';

interface Props {
  topic: string;
  builtinData: TopicData | null;
  forceGenerate: boolean;
}

const LS_META_KEY = 'tf_generated_topics_meta';
function lsTopicKey(t: string) { return `tf_topic_${t}`; }

function saveGeneratedToLS(data: TopicData) {
  try {
    const meta = { id: data.topic, title: data.title, icon: data.icon, description: data.description, count: data.cards.length, source: 'generated' as const };
    const raw = localStorage.getItem(LS_META_KEY);
    const existing: typeof meta[] = raw ? JSON.parse(raw) : [];
    const updated = [...existing.filter(m => m.id !== data.topic), meta];
    localStorage.setItem(LS_META_KEY, JSON.stringify(updated));
    localStorage.setItem(lsTopicKey(data.topic), JSON.stringify(data));
  } catch {}
}

type AppState = 'generate' | 'generating' | 'playing' | 'done';

function shuffle<T>(arr: T[]): T[] {
  return arr.map(v => [Math.random(), v] as [number, T]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
}

export default function FlashcardDeck({ topic, builtinData, forceGenerate }: Props) {
  const [state, setState] = useState<AppState>((builtinData && !forceGenerate) ? 'playing' : 'generate');
  const [allCards, setAllCards] = useState<Card[]>(builtinData?.cards ?? []);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState('Todas');
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [skip, setSkip] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [deepenOpen, setDeepenOpen] = useState(false);
  const [deepenContent, setDeepenContent] = useState('');
  const [deepenLoading, setDeepenLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [topicTitle, setTopicTitle] = useState(builtinData?.title ?? topic);

  const startPlay = useCallback((rawCards: Card[]) => {
    const cats = ['Todas', ...Array.from(new Set(rawCards.map(c => c.cat)))];
    setAllCards(rawCards);
    setCategories(cats);
    setActiveCat('Todas');
    setCards(shuffle(rawCards));
    setIdx(0); setCorrect(0); setSkip(0); setWrong(0);
    setRevealed(false); setDeepen(false);
    setState('playing');
  }, []);

  useEffect(() => {
    if (builtinData && !forceGenerate) {
      setTopicTitle(builtinData.title || topic);
      startPlay(builtinData.cards);
    } else if (!builtinData && !forceGenerate) {
      try {
        const raw = localStorage.getItem(lsTopicKey(topic));
        if (raw) {
          const saved: TopicData = JSON.parse(raw);
          setTopicTitle(saved.title || topic);
          startPlay(saved.cards);
        }
      } catch {}
    }
  }, [builtinData, forceGenerate, topic, startPlay]);

  function setDeepen(open: boolean) {
    setDeepenOpen(open);
    if (!open) { setDeepenContent(''); setDeepenLoading(false); }
  }

  function selectCat(cat: string) {
    setActiveCat(cat);
    const filtered = cat === 'Todas' ? [...allCards] : allCards.filter(c => c.cat === cat);
    setCards(shuffle(filtered));
    setIdx(0); setCorrect(0); setSkip(0); setWrong(0);
    setRevealed(false); setDeepen(false);
  }

  function revealAnswer() {
    if (!revealed) setRevealed(true);
  }

  function mark(type: 'correct' | 'skip' | 'wrong') {
    if (type === 'correct') setCorrect(p => p + 1);
    else if (type === 'wrong') setWrong(p => p + 1);
    else setSkip(p => p + 1);

    if (type !== 'skip') {
      setFlash(type === 'correct' ? 'correct' : 'wrong');
      setTimeout(() => setFlash(null), 400);
    }

    setDeepen(false);
    setTimeout(() => {
      setRevealed(false);
      setIdx(p => {
        const next = p + 1;
        if (next >= cards.length) { setState('done'); return p; }
        return next;
      });
    }, 300);
  }

  function restart() {
    const filtered = activeCat === 'Todas' ? [...allCards] : allCards.filter(c => c.cat === activeCat);
    setCards(shuffle(filtered));
    setIdx(0); setCorrect(0); setSkip(0); setWrong(0);
    setRevealed(false); setDeepen(false);
    setState('playing');
  }

  async function generate() {
    setState('generating');
    setGenerateError('');
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count: 30 }),
      });
      const data = await r.json() as { cards?: Card[]; error?: string };
      if (!r.ok || !data.cards?.length) throw new Error(data.error || 'Sin cards en la respuesta');

      const cap = topic.charAt(0).toUpperCase() + topic.slice(1);
      setTopicTitle(cap);
      const newTopicData: TopicData = {
        topic,
        title: cap,
        icon: '✦',
        description: `Generado con IA · ${data.cards.length} cards`,
        cards: data.cards,
      };
      saveGeneratedToLS(newTopicData);
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopicData),
      }).catch(() => {});
      startPlay(data.cards);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Error desconocido');
      setState('generate');
    }
  }

  async function deepen() {
    if (deepenOpen) { setDeepen(false); return; }
    const card = cards[idx];
    setDeepenOpen(true);
    setDeepenLoading(true);
    setDeepenContent('');
    try {
      const r = await fetch('/api/deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicTitle, question: card.q, answer: card.a }),
      });
      const data = await r.json() as { explanation?: string; error?: string };
      if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
      setDeepenContent(data.explanation || 'Sin respuesta.');
    } catch (err) {
      setDeepenContent(`<span class="text-wrong font-mono text-sm">Error: ${err instanceof Error ? err.message : 'desconocido'}</span>`);
    } finally {
      setDeepenLoading(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (state !== 'playing') return;
      if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); revealAnswer(); }
      if (revealed) {
        if (e.key === '1') mark('correct');
        if (e.key === '2') mark('skip');
        if (e.key === '3') mark('wrong');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const card = cards[idx];
  const pct = cards.length ? Math.round((idx / cards.length) * 100) : 0;

  if (state === 'generate' || state === 'generating') {
    return (
      <div className="state-screen">
        {state === 'generating' ? (
          <>
            <div className="big-spinner" />
            <div className="state-title">Generando con IA</div>
            <div className="state-sub">Consultando Groq para &quot;{topic}&quot;...</div>
          </>
        ) : (
          <>
            <div className="state-icon">✦</div>
            <div className="state-title">Generar flashcards: {topic}</div>
            <div className="state-sub">
              Crear ~30 preguntas de entrevista sobre &quot;{topic}&quot; con IA.
              {generateError && <><br /><span className="text-wrong">Error: {generateError}</span></>}
            </div>
            <button className="btn-ai" onClick={generate}>
              Generar flashcards →
            </button>
          </>
        )}
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="done-screen">
        <h2>🏁 ¡Terminado!</h2>
        <p>Resultado de tu sesión</p>
        <div className="score-grid">
          <div className="score-item"><div className="score-num text-correct">{correct}</div><div className="score-label">LO SÉ</div></div>
          <div className="score-item"><div className="score-num text-skip">{skip}</div><div className="score-label">REPASAR</div></div>
          <div className="score-item"><div className="score-num text-wrong">{wrong}</div><div className="score-label">NO SÉ</div></div>
        </div>
        <button className="btn-restart" onClick={restart}>↺ Repetir</button>
      </div>
    );
  }

  if (!card) return null;

  return (
    <>
      <div className="cats">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-btn ${cat === activeCat ? 'active' : ''}`}
            onClick={() => selectCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="progress-wrap">
        <div className="progress-info">
          <span>Tarjeta {idx + 1} de {cards.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-dot dot-correct" /><span className="stat-count">{correct}</span> sé</div>
        <div className="stat"><div className="stat-dot dot-skip" /><span className="stat-count">{skip}</span> repasar</div>
        <div className="stat"><div className="stat-dot dot-wrong" /><span className="stat-count">{wrong}</span> no sé</div>
      </div>

      <div className="card-area">
        <div
          className={`card ${revealed ? 'reveal' : ''} ${flash === 'correct' ? 'correct-flash' : ''} ${flash === 'wrong' ? 'wrong-flash' : ''}`}
          onClick={revealAnswer}
        >
          <div className="card-category">{card.cat}</div>
          <div className="card-label">Pregunta</div>
          <div className="card-question" dangerouslySetInnerHTML={{ __html: card.q }} />
          {revealed && (
            <div className="card-answer visible" dangerouslySetInnerHTML={{ __html: card.a }} />
          )}
          {!revealed && <div className="tap-hint">click para ver respuesta →</div>}
        </div>

        <div className={`deepen-panel ${deepenOpen ? 'open' : ''}`}>
          <div className="deepen-header">✦ profundizar</div>
          <div className="deepen-content">
            {deepenLoading
              ? <div className="deepen-spinner"><div className="spinner" />Consultando Groq...</div>
              : <div dangerouslySetInnerHTML={{ __html: deepenContent }} />
            }
          </div>
        </div>
      </div>

      {!revealed ? (
        <div className="reveal-row">
          <button className="btn btn-reveal" onClick={revealAnswer}>👁 Ver respuesta</button>
        </div>
      ) : (
        <div className="actions">
          <button className="btn btn-correct" onClick={() => mark('correct')}>✓ Lo sé</button>
          <button className="btn btn-skip" onClick={() => mark('skip')}>~ Repasar</button>
          <button className="btn btn-wrong" onClick={() => mark('wrong')}>✗ No sé</button>
          <button className="btn btn-deepen" onClick={deepen}>
            {deepenOpen ? '✦ Cerrar' : '✦ Profundizar'}
          </button>
        </div>
      )}
    </>
  );
}
