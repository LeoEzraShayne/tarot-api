const supportive = new Set(['fire:air','air:fire','water:earth','earth:water']);
const tense = new Set(['fire:water','water:fire','air:earth','earth:air']);

export function analyzeRelations(evidence) {
  const relations = [];
  for (let i=0;i<evidence.length;i++) for (let j=i+1;j<evidence.length;j++) {
    const pair = `${evidence[i].element}:${evidence[j].element}`;
    if (supportive.has(pair)) relations.push({ type:'element-support', cards:[evidence[i].cardId,evidence[j].cardId], note:'两张牌的元素倾向相互支持。' });
    if (tense.has(pair)) relations.push({ type:'element-tension', cards:[evidence[i].cardId,evidence[j].cardId], note:'两张牌呈现需要调和的元素张力。' });
    if (evidence[i].number === evidence[j].number) relations.push({ type:'number-repeat', cards:[evidence[i].cardId,evidence[j].cardId], note:`数字 ${evidence[i].number} 重复，作为弱证据提示主题加强。` });
  }
  const reversedCount = evidence.filter(x => x.orientation === 'reversed').length;
  if (reversedCount >= 2) relations.push({ type:'blocked-pattern', cards:evidence.filter(x=>x.orientation==='reversed').map(x=>x.cardId), note:'多张逆位提示重点可能在内在阻力或调整，而非外部定论。' });
  return Object.freeze(relations.map(Object.freeze));
}
