import { cardById, DATASET } from './data/cards.mjs';
import { SPREAD } from './draw.mjs';
import { analyzeQuestion } from './context.mjs';
import { analyzeRelations } from './relations.mjs';
import { safetyFor, safeActions } from './safety.mjs';

export function interpret({ question, userContext = '', draw }) {
  if (!question?.trim()) throw new Error('question is required');
  if (!Array.isArray(draw) || draw.length !== 3) throw new Error('exactly three drawn cards are required');
  const context = analyzeQuestion(question, userContext);
  const seen = new Set();
  const evidence = draw.map((item, index) => {
    const position = SPREAD[index]; const card = cardById.get(item.cardId);
    if (!card) throw new Error(`unknown card: ${item.cardId}`);
    if (item.positionId !== position.id) throw new Error(`position mismatch at index ${index}`);
    if (!['upright','reversed'].includes(item.orientation)) throw new Error('invalid orientation');
    if (seen.has(card.id)) throw new Error('duplicate card'); seen.add(card.id);
    const reversed = item.orientation === 'reversed';
    return Object.freeze({ evidenceId:`card-${index+1}`, positionId:position.id, position:position.label, weight:position.weight,
      cardId:card.id, cardName:card.name, orientation:item.orientation, element:card.element, number:card.number,
      keywords:reversed ? card.reversed : card.upright, baseMeaning:reversed ? card.reversedMeaning : card.uprightMeaning });
  });
  const relations = analyzeRelations(evidence);
  const sections = evidence.map(e => ({ evidenceIds:[e.evidenceId], title:`${e.position}：${e.cardName}${e.orientation==='reversed'?'（逆位）':''}`,
    text:`在“${e.position}”位置，这张牌更适合被理解为：${e.baseMeaning}` }));
  const coverage = (evidence.length / 3) * .55 + context.specificity * .3 + (relations.length ? .15 : .08);
  return Object.freeze({ schemaVersion:'1.0', engineVersion:'0.1.0', dataset:DATASET, question, userContext, context,
    draw:Object.freeze(draw.map(Object.freeze)), evidence:Object.freeze(evidence), relations,
    synthesis:`这组三张牌提供的是围绕“${question}”的反思框架，而不是确定性预测。先辨认背景模式，再处理当前核心，最后把建议缩小为可验证的小步骤。`,
    sections:Object.freeze(sections.map(Object.freeze)), actions:safeActions(context), safety:safetyFor(context),
    confidence:Object.freeze({ score:Number(Math.min(.9, coverage).toFixed(2)), meaning:'规则覆盖度与上下文充分度，不是预言命中概率', limitations:Object.freeze(['最小校准牌组','未获知的现实信息可能改变判断','元素和数字关系仅作弱证据']) }) });
}
