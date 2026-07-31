import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.mjs';
import { tarotCards } from '../src/tarotoo.mjs';
import { tarotCardsZh } from '../src/data/cards.zh.mjs';
import { SPREADS, localizedSpreads } from '../src/spreads.mjs';
import { createReadingSession, chooseCards, revealCards, resetSessions } from '../src/session-engine.mjs';
import { deterministicInterpretation } from '../src/reading-engine.mjs';

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
