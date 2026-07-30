import { appendFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function appendEvent(path, type, payload, { readingId = randomUUID(), at = new Date().toISOString() } = {}) {
  if (!['reading.created','feedback.added','review.added'].includes(type)) throw new Error('unsupported event type');
  const event = Object.freeze({ eventId:randomUUID(), readingId, type, at, payload });
  await appendFile(path, `${JSON.stringify(event)}\n`, { encoding:'utf8', mode:0o600 });
  return event;
}

export async function readEvents(path) {
  try { return (await readFile(path,'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
