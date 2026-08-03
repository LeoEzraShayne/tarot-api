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

const targetFor=(count,locale)=>locale==='zh-CN'?({1:'500–800 Chinese characters',3:'1200–1800 Chinese characters',6:'2200–3000 Chinese characters',10:'3200–4500 Chinese characters'}[count]||'substantial detail'):({1:'300–500 words',3:'700–1100 words',6:'1300–1900 words',10:'1900–2800 words'}[count]||'substantial detail');
const systemFor=locale=>locale==='zh-CN'
  ?'你是一个克制、具体、以证据为基础的塔罗反思编辑。你不能预测必然未来，不能补造用户经历，也不能给出医疗、法律、财务或心理诊断。只引用提供的 evidenceId。每个判断都要落到问题语境、可观察事实或可逆行动。'
  :'You are a restrained, specific, evidence-grounded tarot reflection editor. Never promise outcomes, invent biography, or give medical, legal, financial, or mental-health diagnoses. Cite only supplied evidenceIds. Ground every claim in the question, observable facts, or reversible action.';

function promptFor(base,locale){
  const evidence=base.sections.map(section=>({evidenceId:section.evidenceIds[0],position:section.position,cardName:section.cardName,orientation:section.orientation,keywords:section.keywords,baseMeaning:section.baseMeaning}));
  return JSON.stringify({locale,question:base.question,userContext:base.userContext||'',spread:base.spread,evidence,deterministicRelations:base.relations,requiredLength:targetFor(base.sections.length,locale),requiredStructure:['direct response to the question','each card in its position and context','support conflict and transition between cards','assumptions and uncertainty','48-hour action, short-term observation, review question'],safety:'Reflection, not prediction. Do not alter card facts.'});
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
  return new OpenAI({apiKey:process.env.OPENAI_API_KEY});
}

async function requestNarrative(openai,base,locale,repair=false){
  const response=await openai.responses.create({
    model:MODEL,
    reasoning:{effort:'low'},
    text:{verbosity:'high',format:{type:'json_schema',name:'tarot_interpretation',strict:true,schema:narrativeSchema}},
    input:[
      {role:'system',content:[{type:'input_text',text:systemFor(locale)}]},
      {role:'user',content:[{type:'input_text',text:promptFor(base,locale)+(repair?'\nYour previous response failed evidence validation. Return a corrected complete response using every card exactly once.':'')}]}
    ]
  },{timeout:repair?15000:35000});
  return validate(JSON.parse(response.output_text),base);
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
    catch(first){if(/timeout|429|5\d\d|connection/i.test(String(first?.message||first)))throw first;narrative=await requestNarrative(openai,base,locale,true);}
    const result=merge(base,narrative);s.state='interpreted';s.interpretations[key]=result;
    console.info(JSON.stringify({event:'interpretation',sessionId:s.id,mode:'ai',model:MODEL,promptVersion:PROMPT_VERSION,latencyMs:Date.now()-started}));
    return result;
  }catch(error){
    console.warn(JSON.stringify({event:'interpretation',sessionId:s.id,mode:'rules',model:MODEL,promptVersion:PROMPT_VERSION,latencyMs:Date.now()-started,fallbackReason:error?.name||'generation_failed'}));
    return base;
  }
}
