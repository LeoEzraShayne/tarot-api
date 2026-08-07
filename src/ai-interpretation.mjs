import { getSession } from './session-engine.mjs';
import { buildDeterministicInterpretation, PROMPT_VERSION } from './reading-engine.mjs';

const MODEL=process.env.OPENAI_MODEL||'gpt-5.2';
let injectedClient=null;
export function setAiClientForTests(client){injectedClient=client;}

const narrativeSchema={
  type:'object',additionalProperties:false,
  required:['headline','synthesis','relations','sections','assumptions','actionPlan'],
  properties:{
    headline:{type:'string'},
    synthesis:{type:'string'},
    relations:{type:'array',items:{type:'object',additionalProperties:false,required:['text','evidenceIds'],properties:{text:{type:'string'},evidenceIds:{type:'array',items:{type:'string'}}}}},
    sections:{type:'array',items:{type:'object',additionalProperties:false,required:['evidenceId','contextualMeaning','relation','reflectionQuestion'],properties:{evidenceId:{type:'string'},contextualMeaning:{type:'string'},relation:{type:'string'},reflectionQuestion:{type:'string'}}}},
    assumptions:{type:'array',items:{type:'string'}},
    actionPlan:{type:'array',items:{type:'object',additionalProperties:false,required:['action','reason','timeframe','observableSignal','evidenceIds'],properties:{action:{type:'string'},reason:{type:'string'},timeframe:{type:'string'},observableSignal:{type:'string'},evidenceIds:{type:'array',items:{type:'string'}}}}}
  }
};

const targetFor=(count,locale)=>locale==='zh-CN'?({1:'700–1000 Chinese characters',3:'1600–2300 Chinese characters',6:'2800–3800 Chinese characters',10:'4200–5600 Chinese characters'}[count]||'substantial detail'):({1:'400–650 words',3:'950–1400 words',6:'1700–2400 words',10:'2600–3600 words'}[count]||'substantial detail');
const systemFor=locale=>locale==='zh-CN'
  ?'你是一个温和、充实、具体且以证据为基础的塔罗反思编辑。你的解读要让用户感到被认真理解：充分解释每张牌，但不靠重复、空泛安慰或夸大确定性凑篇幅。你不能预测必然未来，不能补造用户经历，也不能给出医疗、法律、财务或心理诊断。只引用提供的 evidenceId。每个判断都要落到问题语境、可观察事实或可逆行动。'
  :'You are a warm, substantial, specific, evidence-grounded tarot reflection editor. Help the user feel thoughtfully understood by explaining every card fully, without padding, generic reassurance, or false certainty. Never promise outcomes, invent biography, or give medical, legal, financial, or mental-health diagnoses. Cite only supplied evidenceIds. Ground every claim in the question, observable facts, or reversible action.';

function promptFor(base,locale){
  const evidence=base.sections.map(section=>({evidenceId:section.evidenceIds[0],position:section.position,cardName:section.cardName,orientation:section.orientation,keywords:section.keywords,baseMeaning:section.baseMeaning}));
  const sectionLength=locale==='zh-CN'?{contextualMeaning:'每张 180–280 个汉字，3–5 句',relation:'每张 90–160 个汉字，2–3 句',reflectionQuestion:'每张 35–70 个汉字，1–2 个具体问题'}:{contextualMeaning:'110–170 words per card, 3–5 sentences',relation:'55–95 words per card, 2–3 sentences',reflectionQuestion:'25–45 words per card, 1–2 specific questions'};
  return JSON.stringify({locale,question:base.question,userContext:base.userContext||'',spread:base.spread,evidence,deterministicRelations:base.relations,requiredLength:targetFor(base.sections.length,locale),perCardRequirements:sectionLength,requiredStructure:['answer the question directly before qualifying it','for every card explain the core meaning, how orientation changes it, how it may appear in this position, and what observable sign would support or challenge it','connect every card to at least one other position or the spread trajectory; do not repeat the same relation sentence','include both a supportive possibility and a realistic caution without promising an outcome','state assumptions and uncertainty','give a 48-hour action, a short-term observation, and a review question'],style:['warm and reassuring without flattery','specific rather than mystical','use natural paragraphs, not keyword lists','do not repeat stock disclaimers inside every card'],safety:'Reflection, not prediction. Do not alter card facts.'});
}

function validate(narrative,base){
  if(!narrative||typeof narrative!=='object')throw new Error('invalid narrative');
  const allowed=new Set(base.sections.flatMap(s=>s.evidenceIds));
  const check=value=>{if(!Array.isArray(value)||!value.length||new Set(value).size!==value.length||value.some(id=>!allowed.has(id)))throw new Error('invalid evidenceIds');};
  if(typeof narrative.headline!=='string'||typeof narrative.synthesis!=='string'||narrative.sections?.length!==base.sections.length)throw new Error('invalid narrative shape');
  for(const relation of narrative.relations||[])check(relation.evidenceIds);
  const sectionEvidence=(narrative.sections||[]).map(section=>section.evidenceId);
  check(sectionEvidence);
  if(sectionEvidence.length!==allowed.size||sectionEvidence.some(id=>!allowed.has(id)))throw new Error('missing section evidence');
  for(const section of narrative.sections||[]){if(!['contextualMeaning','relation','reflectionQuestion'].every(key=>typeof section[key]==='string'&&section[key].trim()))throw new Error('invalid section');}
  if(!Array.isArray(narrative.assumptions)||!narrative.assumptions.length)throw new Error('invalid assumptions');
  if(!Array.isArray(narrative.actionPlan)||!narrative.actionPlan.length)throw new Error('invalid actionPlan');
  for(const item of narrative.actionPlan)check(item.evidenceIds);
  return narrative;
}

function merge(base,narrative){
  const byId=new Map(narrative.sections.map(section=>[section.evidenceId,section]));
  return {...base,headline:narrative.headline,synthesis:narrative.synthesis,relations:narrative.relations,sections:base.sections.map(section=>{const generated=byId.get(section.evidenceIds[0]);return {...section,contextualMeaning:generated.contextualMeaning,relation:generated.relation,reflectionQuestion:generated.reflectionQuestion};}),assumptions:narrative.assumptions,actionPlan:narrative.actionPlan,nextStep:narrative.actionPlan[0].action,generation:{mode:'ai',model:MODEL,promptVersion:PROMPT_VERSION}};
}

async function client(){
  if(injectedClient)return injectedClient;
  if(!process.env.OPENAI_API_KEY)return null;
  const {default:OpenAI}=await import('openai');
  return new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:35000});
}

async function requestNarrative(openai,base,locale,repair=false){
  const timeout=repair?15000:35000;
  const response=await openai.responses.create({
    model:MODEL,
    reasoning:{effort:'low'},
    text:{verbosity:'high',format:{type:'json_schema',name:'tarot_interpretation',strict:true,schema:narrativeSchema}},
    input:[
      {role:'system',content:[{type:'input_text',text:systemFor(locale)}]},
      {role:'user',content:[{type:'input_text',text:promptFor(base,locale)+(repair?'\nYour previous response failed evidence validation. Return a corrected complete response using every card exactly once.':'')}]}
    ]
  },{timeout,maxRetries:0,signal:AbortSignal.timeout(timeout)});
  return validate(JSON.parse(response.output_text),base);
}

function isOperationalFailure(error){
  const status=Number(error?.status||error?.statusCode||0);
  const name=String(error?.name||'').toLowerCase();
  const message=String(error?.message||error||'').toLowerCase();
  return name.includes('abort')||name.includes('timeout')||status===429||status>=500||/aborted|timeout|timed out|429|connection|network|socket/.test(message);
}

export async function generateInterpretation(id,locale='en'){
  const s=getSession(id);
  if(!['revealed','interpreted'].includes(s.state))throw Object.assign(new Error('Reveal cards before interpretation.'),{statusCode:409});
  const key='ai:'+locale+':'+PROMPT_VERSION;
  if(s.interpretations?.[key])return s.interpretations[key];
  const base=buildDeterministicInterpretation(s,locale),openai=await client();
  if(!openai)return base;
  const started=Date.now();
  try{
    let narrative;
    try{narrative=await requestNarrative(openai,base,locale);}
    catch(first){if(isOperationalFailure(first))throw first;narrative=await requestNarrative(openai,base,locale,true);}
    const result=merge(base,narrative);s.state='interpreted';s.interpretations[key]=result;
    console.info(JSON.stringify({event:'interpretation',sessionId:s.id,mode:'ai',model:MODEL,promptVersion:PROMPT_VERSION,latencyMs:Date.now()-started}));
    return result;
  }catch(error){
    console.warn(JSON.stringify({event:'interpretation',sessionId:s.id,mode:'rules',model:MODEL,promptVersion:PROMPT_VERSION,latencyMs:Date.now()-started,fallbackReason:error?.name||'generation_failed'}));
    s.state='interpreted';s.interpretations[key]=base;
    return base;
  }
}
