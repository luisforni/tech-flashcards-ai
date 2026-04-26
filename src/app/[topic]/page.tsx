import Link from 'next/link';
import { getTopicData } from '@/lib/topics';
import FlashcardDeck from '@/components/FlashcardDeck';

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ generate?: string }>;
}) {
  const { topic } = await params;
  const sp = await searchParams;
  const forceGenerate = sp.generate === 'true';

  const builtinData = forceGenerate ? null : getTopicData(topic);
  const displayTitle = builtinData?.title ?? (topic.charAt(0).toUpperCase() + topic.slice(1));

  return (
    <div className="flashcard-wrap">
      <div className="nav">
        <Link href="/" className="nav-back">← hub</Link>
        <span className="nav-topic">{topic}</span>
      </div>

      <header style={{ textAlign: 'center', marginBottom: 32, width: '100%', maxWidth: 720 }}>
        <div className="logo">interview prep</div>
        <h1>{displayTitle} <span className="accent">Flashcards</span></h1>
        <div className="subtitle">
          {builtinData?.description ? `// ${builtinData.description}` : '// cero → avanzado · entrevista técnica'}
        </div>
      </header>

      <FlashcardDeck
        topic={topic}
        builtinData={builtinData}
        forceGenerate={forceGenerate}
      />
    </div>
  );
}
