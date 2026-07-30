import { createHash } from 'node:crypto';
import { cards } from './data/cards.mjs';

export const SPREAD = Object.freeze([
  { id:'background', label:'背景', weight:.8 },
  { id:'core', label:'核心状态', weight:1 },
  { id:'advice', label:'建议', weight:1 }
]);

function stream(seed) {
  let counter = 0;
  return () => createHash('sha256').update(`${seed}:${counter++}`).digest().readUInt32BE(0) / 2 ** 32;
}

export function drawThree(seed, deck = cards) {
  if (!seed?.trim()) throw new Error('seed is required for an auditable draw');
  if (deck.length < 3) throw new Error('deck requires at least three cards');
  const random = stream(seed); const pool = [...deck];
  return Object.freeze(SPREAD.map(position => {
    const card = pool.splice(Math.floor(random() * pool.length), 1)[0];
    return Object.freeze({ positionId: position.id, cardId: card.id, orientation: random() < .5 ? 'upright' : 'reversed' });
  }));
}
