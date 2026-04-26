export interface Card {
  cat: string;
  q: string;
  a: string;
}

export interface TopicData {
  topic: string;
  title: string;
  icon: string;
  description: string;
  cards: Card[];
}

export interface TopicMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  count: number;
  source?: 'builtin' | 'generated';
}
