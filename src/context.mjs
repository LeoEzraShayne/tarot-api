const categories = [
  ['health', /健康|生病|诊断|药|治疗|怀孕|自杀|伤害自己/],
  ['legal', /法律|诉讼|起诉|违法|合同纠纷|坐牢/],
  ['financial', /投资|股票|加密|借贷|贷款|破产|财务/],
  ['relationship', /感情|关系|恋爱|复合|伴侣|婚姻|喜欢我/],
  ['career', /工作|职业|面试|升职|辞职|创业|项目/]
];

export function analyzeQuestion(question, context = '') {
  const text = `${question} ${context}`.trim();
  const category = categories.find(([, pattern]) => pattern.test(text))?.[0] ?? 'general';
  const explicitTime = text.match(/(未来|接下来|过去)?\s*(\d+)\s*(天|周|个月|月|年)/)?.[0] ?? null;
  const highStakes = ['health','legal','financial'].includes(category);
  return Object.freeze({ category, timeRange: explicitTime ?? '未指定（建议聚焦未来 2–4 周的可行动范围）', highStakes,
    specificity: Math.min(1, (question.trim().length >= 8 ? .55 : .3) + (context.trim().length >= 8 ? .25 : 0) + (explicitTime ? .2 : 0)) });
}
