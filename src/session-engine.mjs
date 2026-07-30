import crypto from 'node:crypto';
import { spreadById } from './spreads.mjs';
import { tarotCards, tarotCardById, DATASET } from './tarotoo.mjs';

const sessions = new Map();
const hash = value => crypto.createHash('sha256').update(value).digest();
const random = seed => { let x=seed.readUInt32LE(0)||1; return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}; };

function frozenDeck(seed) {
  const rng=random(hash(seed));
  const order=tarotCards.map(card=>card.id);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return {order,orientations:Object.fromEntries(order.map(id=>[id,rng()<0.32?'reversed':'upright']))};
}

export function createReadingSession({question,spreadId,seed}) {
  const normalized=question?.trim();
  if(!normalized || normalized.length>200) throw Object.assign(new Error('Question must contain 1–200 characters.'),{statusCode:400});
  const spread=spreadById.get(spreadId);
  if(!spread?.available) throw Object.assign(new Error('Spread is not available.'),{statusCode:400});
  const id=crypto.randomUUID();
  const frozen=frozenDeck(seed || `${id}:${normalized}:${spreadId}`);
  const session={id,question:normalized,spreadId,state:'selecting',seed:seed||id,order:frozen.order,orientations:frozen.orientations,selections:[],createdAt:new Date().toISOString(),engineVersion:'1.0.0'};
  sessions.set(id,session);
  return publicSession(session);
}

export function getSession(id){const value=sessions.get(id);if(!value)throw Object.assign(new Error('Reading session not found.'),{statusCode:404});return value;}
export function publicSession(s){return {id:s.id,question:s.question,spreadId:s.spreadId,state:s.state,deckSize:s.order.length,selections:s.selections.map(x=>({deckIndex:x.deckIndex,positionIndex:x.positionIndex})),createdAt:s.createdAt,engineVersion:s.engineVersion};}

export function chooseCards(id,indices){
  const s=getSession(id), spread=spreadById.get(s.spreadId);
  if(s.state!=='selecting')throw Object.assign(new Error('Cards cannot be changed in this state.'),{statusCode:409});
  if(!Array.isArray(indices)||indices.length>spread.cards||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=78))throw Object.assign(new Error('Selections must be unique deck indices.'),{statusCode:400});
  s.selections=indices.map((deckIndex,positionIndex)=>({deckIndex,positionIndex,cardId:s.order[deckIndex]}));
  return publicSession(s);
}

export function revealCards(id){
  const s=getSession(id), spread=spreadById.get(s.spreadId);
  if(s.state==='revealed'||s.state==='interpreted')return revealedSession(s);
  if(s.state!=='selecting'||s.selections.length!==spread.cards)throw Object.assign(new Error('Select every required card before revealing.'),{statusCode:409});
  s.state='revealed'; return revealedSession(s);
}

export function revealedSession(s){const spread=spreadById.get(s.spreadId);return {...publicSession(s),cards:s.selections.map((pick,index)=>{const card=tarotCardById.get(pick.cardId);return {positionId:index,position:spread.positions[index],cardId:card.id,cardName:card.name,orientation:s.orientations[card.id],dataset:DATASET};})};}

export function resetSessions(){sessions.clear();}
