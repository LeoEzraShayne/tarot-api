import test from 'node:test';
import assert from 'node:assert/strict';
import { drawThree, interpret, cards } from '../src/index.mjs';

test('auditable draws are deterministic and unique', () => {
  const first=drawThree('same-seed');
  assert.deepEqual(first,drawThree('same-seed'));
  assert.equal(new Set(first.map(x=>x.cardId)).size,3);
});

test('twenty fixed questions preserve the supplied draw', () => {
  const questions=Array.from({length:20},(_,i)=>`What can I understand about situation ${i+1} over the next 2 weeks?`);
  questions.forEach((question,i)=>{
    const draw=drawThree(`case-${i}`);
    const reading=interpret({question,userContext:'I want a practical, reversible next step.',draw});
    assert.deepEqual(reading.draw,draw);
    assert.equal(reading.evidence.length,3);
    assert.match(reading.safety.join(' '),/不保证未来结果/);
    assert.ok(reading.actions.length>=2);
  });
});

test('invalid cards and duplicate cards are rejected', () => {
  const draw=drawThree('validation');
  assert.throws(()=>interpret({question:'What should I consider next?',draw:[draw[0],draw[0],draw[2]]}),/position mismatch|duplicate/);
  assert.throws(()=>interpret({question:'What should I consider next?',draw:[{...draw[0],cardId:'not-a-card'},draw[1],draw[2]]}),/unknown card/);
});

test('calibration deck remains explicit about its current size',()=>assert.equal(cards.length,12));
