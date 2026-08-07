import { getSession, revealedSession } from './session-engine.mjs';
import { spreadById, localizedSpread } from './spreads.mjs';
import { tarotCardById, DATASET } from './tarotoo.mjs';
import { tarotCardZhById } from './data/cards.zh.mjs';

export const PROMPT_VERSION='ritual-rich-v2';

const domainFor=q=>/relationship|partner|love|marriage|friend|关系|伴侣|爱情|婚姻|朋友/i.test(q)?'relationship':/work|career|job|business|money|工作|事业|职业|生意|金钱/i.test(q)?'career':'general';
const localizedCard=(source,locale)=>locale==='zh-CN'?{...source,...tarotCardZhById.get(source.id)}:source;
const contextual=(card,orientation,domain)=>{
  const base=orientation==='reversed'?card.meaningReversed:card.meaningUpright;
  if(domain==='relationship')return (orientation==='reversed'?card.loveReversed:card.love)||base;
  if(domain==='career')return (orientation==='reversed'?card.careerReversed:card.career)||base;
  return base;
};
const ids=cards=>cards.map(card=>card.evidenceId);
const zhOrientation=orientation=>orientation==='reversed'?'逆位':'正位';

function expandedBaseMeaning(card,orientation,locale){
  const keywords=orientation==='reversed'?card.keywordsReversed:card.keywordsUpright;
  const meaning=orientation==='reversed'?card.meaningReversed:card.meaningUpright;
  if(locale==='zh-CN')return meaning+'这里最值得留意的是“'+keywords[0]+'”如何影响你当下的感受与选择，同时也要观察“'+keywords.slice(1).join('”和“')+'”是否已经在现实中出现。'+(orientation==='reversed'?'逆位不等于坏结果，它更常提示能量受阻、被压在心里，或某种做法已经用得过度；看见这一点，也就意味着仍有调整空间。':'正位也不代表事情必然顺利，而是说明这股能量较容易被看见和主动运用；真正的结果仍取决于你如何回应。');
  const orientationLabel=orientation==='reversed'?'reversed':'upright';
  return meaning+' The '+orientationLabel+' card draws particular attention to '+keywords[0]+', while '+keywords.slice(1).join(' and ')+' offer useful signs to watch for in daily life. '+(orientation==='reversed'?'A reversal is not automatically a negative outcome; it often shows energy that is blocked, internalized, delayed, or overused, which also means there is room to adjust it.':'An upright card is not a promise that everything will go smoothly; it shows an energy that may be easier to recognize and use consciously, while the outcome still depends on your response.');
}

function expandedContext({card,source,orientation,position,domain},locale){
  const keywords=orientation==='reversed'?card.keywordsReversed:card.keywordsUpright;
  const domainMeaning=contextual(source,orientation,domain).replace(/\.$/,'');
  if(locale==='zh-CN')return '放在“'+position+'”这个牌位，这张'+zhOrientation(orientation)+'牌把重点落在“'+keywords[0]+'”上。针对你提出的问题，它更像是在提示：“'+keywords[1]+'”和“'+keywords[2]+'”是接下来需要分别核对的两个方向，而不是已经确定的结论。可以留意最近的对话、决定和身体感受中，是否反复出现相同模式；如果现实证据并不支持，也不必勉强套用。'+(orientation==='reversed'?'值得安心的一点是，逆位所呈现的阻力通常不是不可改变的结果；当你能说清阻力发生在哪里，就已经开始拿回选择权。':'这张牌提供的支持在于：你并非毫无资源，只是需要把已经看见的可能性，转化成节奏合适、边界清楚的小步骤。')+'先承认当前处境，再选择一个你能够掌控的动作，会比要求自己立刻得到完整答案更有效。';
  return 'In the '+position.toLowerCase()+' position, this '+orientation+' card puts the emphasis on '+keywords[0]+'. In relation to your question, '+domainMeaning.toLowerCase()+' may describe one part of the situation, while '+keywords[1]+' and '+keywords[2]+' suggest where hesitation, pressure, or unused capacity could be showing up. Look for this pattern in recent conversations, decisions, and physical reactions, and let real evidence challenge the interpretation when it does not fit. The kindest useful response is to acknowledge the present condition and choose one part you can influence, rather than demanding a complete answer from yourself immediately.';
}

function expandedRelation(cards,index,relations,locale){
  const current=cards[index],other=cards[index===cards.length-1?Math.max(0,index-1):index+1];
  const shared=relations.find(item=>item.evidenceIds.includes(current.evidenceId))?.text;
  if(cards.length===1)return locale==='zh-CN'?'因为这是本次唯一的牌位，它同时承担了现状、提醒与行动方向三层含义。先不要急着把它判断为好或坏；用未来几天里一个具体事件来核对，会比凭第一感觉下结论更有帮助。你也可以在情绪平稳后再读一次，看看最先注意到的关键词是否发生变化，这种变化本身就是有价值的线索。':'Because this is the only position, it carries the present situation, the caution, and the possible direction at once. Resist labeling it simply good or bad; checking it against one concrete event over the next few days will be more useful than trusting the first impression alone. Read it once more when you feel settled and notice whether a different keyword stands out; that change in attention is useful evidence too.';
  if(locale==='zh-CN')return (shared?shared:'这张牌需要放进整副牌的走向中理解。')+'它与“'+other.position+'”的“'+other.keywords[0]+'”形成呼应：前者说明你此刻需要看见什么，后者则提示这种状态可能如何延续、转化或受到修正。两张牌如果看似矛盾，不必二选一，它们也可能分别描述你的内在感受和外部现实。';
  return (shared||'This card is best understood within the movement of the full spread.')+' It speaks to '+other.keywords[0]+' in the '+other.position.toLowerCase()+' position: one shows what deserves attention now, while the other suggests how that condition could continue, change, or be corrected. If the two cards appear contradictory, they may be describing your internal experience and external reality rather than demanding that you choose only one.';
}

function expandedReflection(position,keywords,locale){
  return locale==='zh-CN'?'回看最近七天，哪一个具体事实最能证明或反驳“'+position+'”中的“'+keywords[0]+'”？如果只做一次成本很小、可以撤回的尝试，你愿意先改变什么？':'Looking back over the last seven days, what concrete fact most clearly supports or challenges '+keywords[0]+' in the '+position.toLowerCase()+' position? If you tried one low-cost, reversible change, what would you adjust first?';
}

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
  const sections=cards.map(({evidenceId,card,source,orientation,position})=>{const keywords=orientation==='reversed'?card.keywordsReversed:card.keywordsUpright;return {evidenceIds:[evidenceId],position,cardId:card.id,cardName:card.name,orientation,keywords,baseMeaning:expandedBaseMeaning(card,orientation,locale),contextualMeaning:expandedContext({card,source,orientation,position,domain},locale),relation:'',reflectionQuestion:expandedReflection(position,keywords,locale)};});
  const enrichedCards=cards.map((item,index)=>({...item,keywords:sections[index].keywords}));
  sections.forEach((section,index)=>{section.relation=expandedRelation(enrichedCards,index,relations,locale);});
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
  if(!saved?.draw?.length||(saved.locale===locale&&saved.generation?.promptVersion===PROMPT_VERSION))return saved;
  const selections=saved.draw.map((card,index)=>({deckIndex:index,positionIndex:index,cardId:String(card.cardId)}));
  const snapshot={id:'stored',question:saved.question,userContext:saved.userContext||'',spreadId:saved.spread.id,state:'revealed',seed:'stored',order:DATASET.cardCount?Array.from({length:DATASET.cardCount},(_,index)=>String(index)):[],orientations:Object.fromEntries(saved.draw.map(card=>[String(card.cardId),card.orientation])),selections,createdAt:new Date(0).toISOString(),engineVersion:saved.engineVersion||'1.0.0'};
  return buildDeterministicInterpretation(snapshot,locale);
}
