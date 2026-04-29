import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { TopicData, TopicMeta } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function POST(req: NextRequest) {
  try {
    const data: TopicData = await req.json();

    if (!data.topic || !data.cards?.length) {
      return NextResponse.json({ error: 'topic y cards requeridos' }, { status: 400 });
    }

    const topicId = data.topic.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const topicFile = path.join(DATA_DIR, `${topicId}.json`);
    fs.writeFileSync(topicFile, JSON.stringify({ ...data, topic: topicId }, null, 2), 'utf-8');

    const topicsFile = path.join(DATA_DIR, 'topics.json');
    let topics: TopicMeta[] = [];
    try {
      topics = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'));
    } catch {}

    const meta: TopicMeta = {
      id: topicId,
      title: data.title,
      icon: data.icon,
      description: data.description,
      count: data.cards.length,
    };

    const updated = [...topics.filter(t => t.id !== topicId), meta];
    fs.writeFileSync(topicsFile, JSON.stringify(updated, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, topicId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
