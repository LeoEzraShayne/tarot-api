import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.mjs';
import { tarotCards } from '../src/tarotoo.mjs';
import { tarotCardsZh } from '../src/data/cards.zh.mjs';
import { SPREADS, localizedSpreads } from '../src/spreads.mjs';
import { createReadingSession, chooseCards, revealCards, resetSessions } from '../src/session-engine.mjs';
import { deterministicInterpretation, localizeStoredInterpretation, PROMPT_VERSION } from '../src/reading-engine.mjs';

test('all 78 cards have a unique and complete Chinese mapping',()=>{
  assert.equal(tarotCardsZh.length,78);
  assert.equal(new Set(tarotCardsZh.map(card=>card.id)).size,78);
  assert.deepEqual(tarotCardsZh.map(card=>card.id),tarotCards.map(card=>card.id));
  for(const card of tarotCardsZh){
    assert.ok(card.name&&card.keywordsUpright.length&&card.keywordsReversed.length);
    assert.ok(card.meaningUpright&&card.meaningReversed);
  }
});

test('all spreads and launch positions have Chinese names',()=>{
  const zh=localizedSpreads('zh-CN');
  assert.equal(zh.length,SPREADS.length);
  assert.ok(zh.every(spread=>spread.name&&spread.name!==SPREADS.find(x=>x.id===spread.id).name));
  assert.ok(zh.filter(x=>x.available).every(spread=>spread.positions.length===spread.cards&&spread.positions.every(Boolean)));
});

test('English and Chinese interpretations preserve identical evidence',async()=>{
  resetSessions();
  for(let i=0;i<20;i++){
    const {id}=createReadingSession({question:`What can I understand about case ${i}?`,spreadId:['general-reflection','relationship-reflection','work-direction','decision-clarity'][i%4],seed:`bilingual-${i}`});
    chooseCards(id,[i%20,(i+21)%50,(i+55)%78]);
    const enReveal=revealCards(id,'en'),zhReveal=revealCards(id,'zh-CN');
    const en=deterministicInterpretation(id,'en'),zh=deterministicInterpretation(id,'zh-CN');
    const evidence=value=>value.map(card=>[card.positionId,card.cardId,card.orientation]);
    assert.deepEqual(evidence(enReveal.cards),evidence(zhReveal.cards));
    assert.deepEqual(evidence(en.draw),evidence(zh.draw));
    assert.equal(en.confidence.score,zh.confidence.score);
    assert.equal(en.locale,'en');assert.equal(zh.locale,'zh-CN');
  }
});

test('saved readings are localized without changing their draw',()=>{
  resetSessions();
  const {id}=createReadingSession({question:'What should I understand about this change?',spreadId:'celtic-cross-classic',seed:'saved-localization'});
  chooseCards(id,Array.from({length:10},(_,index)=>index*7));
  revealCards(id,'en');
  const saved=deterministicInterpretation(id,'en');
  const localized=localizeStoredInterpretation(saved,'zh-CN');
  const evidence=value=>value.draw.map(card=>[card.positionId,card.cardId,card.orientation]);
  assert.equal(localized.locale,'zh-CN');
  assert.deepEqual(evidence(localized),evidence(saved));
  assert.equal(localized.confidence.score,saved.confidence.score);
  assert.notEqual(localized.sections[0].cardName,saved.sections[0].cardName);
  assert.match(localized.safety,/用于反思/);
});

test('rule fallback gives every card a substantial interpretation across spread sizes',()=>{
  resetSessions();
  for(const [spreadId,count] of [['single-focus',1],['general-reflection',3],['whole-self',6],['celtic-cross-classic',10]]){
    const {id}=createReadingSession({question:'我应该怎样面对目前的变化？',userContext:'事情还没有完全确定。',spreadId,seed:'rich-fallback-'+count});
    chooseCards(id,Array.from({length:count},(_,index)=>index*7));revealCards(id,'zh-CN');
    const result=deterministicInterpretation(id,'zh-CN');
    for(const section of result.sections){
      assert.ok(section.baseMeaning.length>=100);
      assert.ok(section.contextualMeaning.length>=180);
      assert.ok(section.relation.length>=85);
      assert.ok(section.reflectionQuestion.length>=45);
    }
  }
});

test('legacy saved readings are upgraded to the current rich prompt version',()=>{
  resetSessions();
  const {id}=createReadingSession({question:'我应该怎样面对目前的变化？',spreadId:'general-reflection',seed:'legacy-upgrade'});
  chooseCards(id,[3,24,67]);revealCards(id,'zh-CN');
  const saved=deterministicInterpretation(id,'zh-CN');
  const legacy={...saved,generation:{...saved.generation,promptVersion:'ritual-long-v1'},sections:saved.sections.map(section=>({...section,contextualMeaning:'旧版短文案。'}))};
  const upgraded=localizeStoredInterpretation(legacy,'zh-CN');
  assert.equal(upgraded.generation.promptVersion,PROMPT_VERSION);
  assert.ok(upgraded.sections.every(section=>section.contextualMeaning.length>=150));
  assert.deepEqual(upgraded.draw,saved.draw);
});

test('unsupported languages fall back to English',async()=>{
  const response=await app.inject({method:'GET',url:'/v1/spreads',headers:{'accept-language':'ja-JP'}});
  assert.equal(response.json().locale,'en');
  assert.equal(response.json().spreads[0].name,'General Reflection');
});

test('validation errors follow the requested language',async()=>{
  const response=await app.inject({method:'POST',url:'/v1/reading-sessions',headers:{'accept-language':'zh-CN'},payload:{question:'',spreadId:'general-reflection'}});
  assert.equal(response.statusCode,400);
  assert.equal(response.json().message,'问题长度须为 1–200 个字符。');
});
