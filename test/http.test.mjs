import test from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
const {default:app}=await import('../src/server.mjs');
test.after(()=>app.close());
test('health and spreads are public',async()=>{const health=await app.inject({method:'GET',url:'/health'});assert.equal(health.statusCode,200);const spreads=await app.inject({method:'GET',url:'/v1/spreads'});assert.equal(spreads.json().spreads.length,14)});
test('complete reading HTTP flow',async()=>{const created=await app.inject({method:'POST',url:'/v1/reading-sessions',payload:{question:'What can I understand about this change?',spreadId:'general-reflection',seed:'http'}});assert.equal(created.statusCode,201);const id=created.json().id;assert.equal((await app.inject({method:'POST',url:`/v1/reading-sessions/${id}/selections`,payload:{deckIndices:[0,10,77]}})).statusCode,200);assert.equal((await app.inject({method:'POST',url:`/v1/reading-sessions/${id}/reveal`})).json().cards.length,3);const result=(await app.inject({method:'POST',url:`/v1/reading-sessions/${id}/interpretation`})).json();assert.equal(result.sections.length,3)});
