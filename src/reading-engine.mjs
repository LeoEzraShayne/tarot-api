import { getSession, revealedSession } from './session-engine.mjs';
import { spreadById, localizedSpread } from './spreads.mjs';
import { tarotCardById, DATASET } from './tarotoo.mjs';
import { tarotCardZhById } from './data/cards.zh.mjs';

export const PROMPT_VERSION='ritual-long-v1';

const domainFor=q=>/relationship|partner|love|marriage|friend|关系|伴侣|爱情|婚姻|朋友/i.test(q)?'relationship':/work|career|job|business|money|工作|事业|职业|生意|金钱/i.test(q)?'career':'general';
const localizedCard=(source,locale)=>locale==='zh-CN'?{...source,...tarotCardZhById.get(source.id)}:source;
const contextual=(card,orientation,domain)=>{
  const base=orientation==='reversed'?card.meaningReversed:card.meaningUpright;
  if(domain==='relationship')return (orientation==='reversed'?card.loveReversed:card.love)||base;
  if(domain==='career')return (orientation==='reversed'?card.careerReversed:card.career)||base;
  return base;
};
const ids=cards=>cards.map(card=>card.evidenceId);

function relationEvidence(cards,locale){
  const result=[],add=(text,matched)=>result.push({text,evidenceIds:ids(matched)});
  const elements=cards.map(x=>x.card.element).filter(Boolean);
  for(const element of new Set(elements)){const matched=cards.filter(x=>x.card.element===element);if(matched.length>1)add(locale==='zh-CN'?'重复出现的'+({Fire:'火、行动',Water:'水、情感',Air:'风、思考',Earth:'土、现实'}[element]||element)+'能量，让这一倾向更加明显。':'Repeated '+element+' energy makes that mode especially visible.',matched);}
  const suits=cards.map(x=>x.card.suit).filter(Boolean);
  for(const suit of new Set(suits)){const matched=cards.filter(x=>x.card.suit===suit);if(matched.length>1)add(locale==='zh-CN'?'重复出现的'+({wands:'权杖',cups:'圣杯',swords:'宝剑',pentacles:'星币'}[suit]||suit)+'牌强化了共同主题。':'Repeated '+suit+' cards reinforce a shared theme.',matched);}
  const byNumber=new Map();for(const card of cards)if(Number.isFinite(card.card.number))byNumber.set(card.card.number,[...(byNumber.get(card.card.number)||[]),card]);
  for(const matched of byNumber.values())if(matched.length>1)add(locale==='zh-CN'?'重复数字提示：同一个主题可能需要从不同角度重新理解。':'A repeated number suggests revisiting the same lesson from more than one angle.',matched);
  const majors=cards.filter(x=>x.card.arcana==='major');if(cards.length>1&&majors.length/cards.length>=.4)add(locale==='zh-CN'?'大阿卡纳占比较高（'+majors.length+'/'+cards.length+'），说明这次反思更偏向长期模式与重要选择。':'Major Arcana are prominent ('+majors.length+'/'+cards.length+'), emphasizing broader patterns and consequential choices.',majors);
  const reversed=cards.filter(x=>x.orientation==='reversed');if(cards.length>2&&reversed.length/cards.length>=.5)add(locale==='zh-CN'?'逆位较多，适合优先检查内在阻力、延迟或尚未表达清楚的部分。':'A high number of reversals suggests looking first at internal friction, delay, or what has not yet been expressed clearly.',reversed);
  return result;
}

function groups(spread,sections,locale){
  const make=(title,items)=>({title,positions:items.map(i=>i.position),evidenceIds:items.flatMap(i=>i.evidenceIds),summary:locale==='zh-CN'?items.map(i=>'“'+i.position+'”中的'+i.keywords[0]).join('，')+'构成了这一组线索。请用现实中的事实检验它。':items.map(i=>i.keywords[0]+' in '+i.position).join(', ')+' form this part of the reading. Check it against observable facts.'});
  if(spread.interpretationFamily==='celtic-cross')return [make(locale==='zh-CN'?'处境与挑战':'Situation & Challenge',sections.slice(0,2)),make(locale==='zh-CN'?'背景与发展':'Background & Development',sections.slice(2,6)),make(locale==='zh-CN'?'内在与外部':'Inner & External',sections.slice(6,8)),make(locale==='zh-CN'?'希望、担忧与方向':'Hopes, Fears & Direction',sections.slice(8,10))];
  if(spread.cards===6)return [make(locale==='zh-CN'?'现实与深层影响':'Reality & Underlying Influence',sections.slice(0,2)),make(locale==='zh-CN'?'阻力与资源':'Friction & Resources',sections.slice(2,4)),make(locale==='zh-CN'?'调整与行动':'Adjustment & Action',sections.slice(4,6))];
  return [];
}

export function buildDeterministicInterpretation(s,locale='en'){
  const sourceSpread=spreadById.get(s.spreadId),spread=localizedSpread(sourceSpread,locale),domain=domainFor(s.question+' '+(s.userContext||''));
  const cards=s.selections.map((pick,index)=>{const source=tarotCardById.get(pick.cardId),card=localizedCard(source,locale),orientation=s.orientations[source.id];return {evidenceId:'card-'+(index+1),position:spread.positions[index],orientation,card,source};});
  const relations=relationEvidence(cards,locale),allEvidence=ids(cards);
  const sections=cards.map(({evidenceId,card,source,orientation,position},index)=>({evidenceIds:[evidenceId],position,cardId:card.id,cardName:card.name,orientation,keywords:orientation==='reversed'?card.keywordsReversed:card.keywordsUpright,baseMeaning:orientation==='reversed'?card.meaningReversed:card.meaningUpright,contextualMeaning:locale==='zh-CN'?'在“'+position+'”位置，可以把'+(orientation==='reversed'?card.meaningReversed:card.meaningUpright)+'当作一种观察角度，而不是固定结论。':'In the '+position.toLowerCase()+' position, consider '+contextual(source,orientation,domain).replace(/\.$/,'').toLowerCase()+' as a lens—not a fixed outcome.',relation:relations[index%Math.max(relations.length,1)]?.text||(cards.length===1?(locale==='zh-CN'?'这张牌是本次反思的唯一焦点，请用一个具体事实检验它。':'This card is the sole focus of the reading; test it against one concrete fact.'):(locale==='zh-CN'?'请把这张牌与其他牌位放在一起理解，而不是孤立判断。':'Read this card alongside the other positions rather than in isolation.')),reflectionQuestion:locale==='zh-CN'?'哪一个可观察的事实，能帮助你检验“'+position+'”所呈现的主题？':'What observable detail would help you test this '+position.toLowerCase()+' theme?'}));
  const headline=locale==='zh-CN'?'真正的清晰，来自看见正在重复的模式。':'Clarity begins with noticing the pattern that keeps returning.';
  const synthesis=sections.length===1?(locale==='zh-CN'?'本次焦点是“'+sections[0].keywords[0]+'”。请把它当作观察角度，并与一个正在发生的事实核对。':'The focus is '+sections[0].keywords[0].toLowerCase()+'. Treat it as a lens and compare it with one fact already in view.'):(locale==='zh-CN'?'这组牌呈现出从“'+sections[0].keywords[0]+'”走向“'+sections.at(-1).keywords[0]+'”的线索，中间牌位说明了影响这一变化的条件。请把它与现实情况相互核对。':'The cards trace a movement from '+sections[0].keywords[0].toLowerCase()+' toward '+sections.at(-1).keywords[0].toLowerCase()+', with the intervening positions showing conditions that shape the movement. Compare that thread with what is actually happening.');
  const action=locale==='zh-CN'?'写下一个可以在未来 48 小时内通过小范围、可逆行动来验证的假设。':'Write down one assumption you can verify through a small, reversible action within the next 48 hours.';
  return {schemaVersion:'1.1',engineVersion:s.engineVersion,locale,dataset:DATASET,question:s.question,userContext:s.userContext||'',spread:{id:spread.id,name:spread.name},draw:revealedSession(s,locale).cards,headline,synthesis,relations,groups:groups(sourceSpread,sections,locale),sections,assumptions:[locale==='zh-CN'?'这份解读假设你描述的问题是当前最重要的关注点；未提供的现实背景可能改变侧重点。':'This reading assumes the question names the most relevant concern; missing real-world context may change the emphasis.'],actionPlan:[{action,reason:locale==='zh-CN'?'小范围行动比确定性预测更容易检验。':'A small action is more testable than a fixed prediction.',timeframe:locale==='zh-CN'?'未来 48 小时':'Within 48 hours',observableSignal:locale==='zh-CN'?'记录行动前后的一个具体变化。':'Record one concrete change before and after the action.',evidenceIds:allEvidence}],nextStep:action,confidence:locale==='zh-CN'?{level:'中等',score:relations.length?0.78:0.7,meaning:'表示问题、牌位和牌面证据的覆盖程度，不是预测命中率。',uncertainty:'尚未提供的现实背景，可能会改变哪一种解释更有帮助。'}:{level:'moderate',score:relations.length?0.78:0.7,meaning:'Coverage of the supplied question, positions and card evidence—not predictive certainty.',uncertainty:'Important real-world context may change which interpretation is most useful.'},safety:locale==='zh-CN'?'本解读用于反思，不是预测。选择权始终属于你；医疗、法律、财务或心理健康问题请咨询合格专业人士。':'For reflection, not prediction. Your choices remain your own; seek qualified help for medical, legal, financial or mental-health decisions.',generation:{mode:'rules',model:null,promptVersion:PROMPT_VERSION}};
}

export function deterministicInterpretation(id,locale='en'){
  const s=getSession(id);if(!['revealed','interpreted'].includes(s.state))throw Object.assign(new Error('Reveal cards before interpretation.'),{statusCode:409});
  const key='rules:'+locale+':'+PROMPT_VERSION;if(s.interpretations?.[key])return s.interpretations[key];
  const result=buildDeterministicInterpretation(s,locale);s.state='interpreted';s.interpretations??={};s.interpretations[key]=result;return result;
}

export function localizeStoredInterpretation(saved,locale='en'){
  if(!saved?.draw?.length||saved.locale===locale)return saved;
  const selections=saved.draw.map((card,index)=>({deckIndex:index,positionIndex:index,cardId:String(card.cardId)}));
  const snapshot={id:'stored',question:saved.question,userContext:saved.userContext||'',spreadId:saved.spread.id,state:'revealed',seed:'stored',order:DATASET.cardCount?Array.from({length:DATASET.cardCount},(_,index)=>String(index)):[],orientations:Object.fromEntries(saved.draw.map(card=>[String(card.cardId),card.orientation])),selections,createdAt:new Date(0).toISOString(),engineVersion:saved.engineVersion||'1.0.0'};
  return buildDeterministicInterpretation(snapshot,locale);
}
