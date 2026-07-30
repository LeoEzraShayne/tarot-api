import { getSession, revealedSession } from './session-engine.mjs';
import { spreadById } from './spreads.mjs';
import { tarotCardById, DATASET } from './tarotoo.mjs';

const domainFor = q => /relationship|partner|love|marriage|friend/i.test(q)?'relationship':/work|career|job|business|money/i.test(q)?'career':'general';
const contextual = (card,orientation,domain) => {
  const base=orientation==='reversed'?card.meaningReversed:card.meaningUpright;
  if(domain==='relationship') return (orientation==='reversed'?card.loveReversed:card.love)||base;
  if(domain==='career') return (orientation==='reversed'?card.careerReversed:card.career)||base;
  return base;
};

function relations(cards){
  const result=[];
  const elements=cards.map(x=>x.card.element).filter(Boolean);
  for(const element of new Set(elements))if(elements.filter(x=>x===element).length>1)result.push(`Repeated ${element} energy makes that mode especially visible.`);
  const suits=cards.map(x=>x.card.suit).filter(Boolean);
  for(const suit of new Set(suits))if(suits.filter(x=>x===suit).length>1)result.push(`Repeated ${suit} cards reinforce a shared theme.`);
  const numbers=cards.map(x=>x.card.number).filter(Number.isFinite);
  if(new Set(numbers).size<numbers.length)result.push('A repeated number suggests revisiting the same lesson from more than one angle.');
  return result;
}

export function deterministicInterpretation(id){
  const s=getSession(id);
  if(!['revealed','interpreted'].includes(s.state))throw Object.assign(new Error('Reveal cards before interpretation.'),{statusCode:409});
  if(s.interpretation)return s.interpretation;
  const spread=spreadById.get(s.spreadId), domain=domainFor(s.question);
  const cards=s.selections.map((pick,index)=>{const card=tarotCardById.get(pick.cardId),orientation=s.orientations[card.id];return {position:spread.positions[index],orientation,card};});
  const links=relations(cards);
  const sections=cards.map(({card,orientation,position},index)=>({
    position,cardId:card.id,cardName:card.name,orientation,
    keywords:orientation==='reversed'?card.keywordsReversed:card.keywordsUpright,
    baseMeaning:orientation==='reversed'?card.meaningReversed:card.meaningUpright,
    contextualMeaning:`In the ${position.toLowerCase()} position, consider ${contextual(card,orientation,domain).replace(/\.$/,'').toLowerCase()} as a lens—not a fixed outcome.`,
    relation:links[index%Math.max(links.length,1)]||'Read this card alongside the other positions rather than in isolation.',
    reflectionQuestion:`What observable detail would help you test this ${position.toLowerCase()} theme?`
  }));
  s.state='interpreted';
  s.interpretation={schemaVersion:'1.0',engineVersion:s.engineVersion,dataset:DATASET,question:s.question,spread:{id:spread.id,name:spread.name},draw:revealedSession(s).cards,
    synthesis:`The cards point to a movement from ${sections[0].keywords[0].toLowerCase()}, through ${sections[1].keywords[0].toLowerCase()}, toward ${sections[2].keywords[0].toLowerCase()}. Treat that thread as a prompt to compare with what is actually happening.`,
    relations:links,sections,nextStep:'Write down one assumption you can verify through a small, reversible action within the next 48 hours.',
    confidence:{level:'moderate',score:links.length?0.78:0.7,meaning:'Coverage of the supplied question, positions and card evidence—not predictive certainty.',uncertainty:'Important real-world context may change which interpretation is most useful.'},
    safety:'For reflection, not prediction. Your choices remain your own; seek qualified help for medical, legal, financial or mental-health decisions.'};
  return s.interpretation;
}
