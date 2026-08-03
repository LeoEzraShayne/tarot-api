import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadingSession, chooseCards, revealCards, resetSessions } from '../src/session-engine.mjs';
import { generateInterpretation, setAiClientForTests } from '../src/ai-interpretation.mjs';

const validNarrative={
  headline:'A grounded headline',
  synthesis:'A detailed synthesis grounded in the three supplied cards.',
  relations:[{text:'The first and second cards create a useful tension.',evidenceIds:['card-1','card-2']}],
  sections:[
    {evidenceId:'card-1',contextualMeaning:'Context one',relation:'Relation one',reflectionQuestion:'Question one?'},
    {evidenceId:'card-2',contextualMeaning:'Context two',relation:'Relation two',reflectionQuestion:'Question two?'},
    {evidenceId:'card-3',contextualMeaning:'Context three',relation:'Relation three',reflectionQuestion:'Question three?'}
  ],
  assumptions:['The question names the current priority.'],
  actionPlan:[{action:'Test one reversible step.',reason:'It creates evidence.',timeframe:'Within 48 hours',observableSignal:'One recorded change.',evidenceIds:['card-1','card-2','card-3']}]
};

function prepared(){
  const session=createReadingSession({question:'What should I understand?',userContext:'A known deadline is approaching.',spreadId:'general-reflection',seed:'ai-test'});
  chooseCards(session.id,[1,22,63]);revealCards(session.id);return session.id;
}

test.beforeEach(()=>{resetSessions();setAiClientForTests(null)});
test.after(()=>setAiClientForTests(null));

test('AI narrative is merged without changing deterministic card evidence',async()=>{
  let calls=0,requestOptions;
  setAiClientForTests({responses:{create:async(_body,options)=>{calls++;requestOptions=options;return {output_text:JSON.stringify(validNarrative)}}}});
  const id=prepared(),result=await generateInterpretation(id,'en');
  assert.equal(result.generation.mode,'ai');assert.equal(result.userContext,'A known deadline is approaching.');
  assert.deepEqual(result.sections.map(x=>x.cardId),result.draw.map(x=>x.cardId));
  assert.deepEqual(result.sections.map(x=>x.evidenceIds[0]),['card-1','card-2','card-3']);
  assert.equal((await generateInterpretation(id,'en')),result);assert.equal(calls,1);
  assert.equal(requestOptions.timeout,35000);assert.equal(requestOptions.maxRetries,0);assert.ok(requestOptions.signal instanceof AbortSignal);
});

test('invalid evidence retries once and falls back to deterministic rules',async()=>{
  let calls=0;
  const invalid={...validNarrative,relations:[{text:'Invented evidence',evidenceIds:['card-99']}]};
  setAiClientForTests({responses:{create:async()=>{calls++;return {output_text:JSON.stringify(invalid)}}}});
  const result=await generateInterpretation(prepared(),'en');
  assert.equal(result.generation.mode,'rules');assert.equal(calls,2);
  assert.deepEqual(result.sections.map(x=>x.cardId),result.draw.map(x=>x.cardId));
});

test('duplicate or missing per-card evidence invalidates the AI result',async()=>{
  let calls=0;
  const duplicated={...validNarrative,sections:validNarrative.sections.map((section,index)=>index===2?{...section,evidenceId:'card-2'}:section)};
  setAiClientForTests({responses:{create:async()=>{calls++;return {output_text:JSON.stringify(duplicated)}}}});
  const result=await generateInterpretation(prepared(),'en');
  assert.equal(result.generation.mode,'rules');
  assert.equal(calls,2);
});

test('optional context is bounded and returned without affecting the frozen deck',()=>{
  assert.throws(()=>createReadingSession({question:'Question',userContext:'x'.repeat(501),spreadId:'general-reflection'}),/500/);
  const session=createReadingSession({question:'Question',userContext:'  A fact.  ',spreadId:'general-reflection',seed:'context'});
  assert.equal(session.userContext,'A fact.');assert.equal(session.deckSize,78);
});
