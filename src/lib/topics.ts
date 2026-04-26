import fs from 'fs';
import path from 'path';
import type { TopicData, TopicMeta } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

export function getTopicsMeta(): TopicMeta[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'topics.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getTopicData(topic: string): TopicData | null {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, `${topic}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
