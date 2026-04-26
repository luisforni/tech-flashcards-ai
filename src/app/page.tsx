import { getTopicsMeta } from '@/lib/topics';
import HubClient from '@/components/HubClient';

export default function Home() {
  const builtinTopics = getTopicsMeta();

  return (
    <div className="page-wrap">
      <div style={{ width: '100%', maxWidth: 860 }}>
        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="logo">interview prep · ai-powered</div>
          <h1>Tech <span className="accent">Flashcards</span> AI</h1>
          <div className="tagline">// cero → avanzado · generado con IA · gratis</div>
        </header>

        <HubClient builtinTopics={builtinTopics} />
      </div>
    </div>
  );
}
