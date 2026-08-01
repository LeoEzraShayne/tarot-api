export const SPREADS = Object.freeze([
  { id:'general-reflection', name:'General Reflection', cards:3, available:true, duration:3, positions:['Background','Core','Guidance'] },
  { id:'relationship-reflection', name:'Relationship Reflection', cards:3, available:true, duration:3, positions:['Your Perspective','Shared Dynamic','Healthy Next Step'] },
  { id:'work-direction', name:'Work & Direction', cards:3, available:true, duration:3, positions:['Current Reality','Friction','Practical Next Step'] },
  { id:'decision-clarity', name:'Decision Clarity', cards:3, available:true, duration:3, positions:['What Matters','What Complicates','Next Step'] },
  { id:'daily-reflection', name:'Daily Reflection', cards:1, available:true, duration:1, positions:["Today's Focus"], layout:'single', interpretationFamily:'focus' },
  { id:'single-focus', name:'One-Card Reflection', cards:1, available:true, duration:1, positions:['Focus'], layout:'single', interpretationFamily:'focus' },
  { id:'past-present-next', name:'Past, Present & Next', cards:3, available:true, duration:3, positions:['Past Influence','Present Reality','Next Development'], layout:'row', interpretationFamily:'timeline' },
  { id:'mind-body-spirit', name:'Mind, Body & Spirit', cards:3, available:true, duration:3, positions:['Mind','Body & Reality','Spirit'], layout:'row', interpretationFamily:'whole-self' },
  { id:'creative-block', name:'Creative Block', cards:3, available:true, duration:3, positions:['Spark','Block','Experiment'], layout:'row', interpretationFamily:'creative' },
  { id:'relationship-check-in', name:'Relationship Check-in', cards:6, available:true, duration:7, positions:['Your Perspective','Observable Dynamic','Unspoken Need','Boundary to Honor','Support Available','Healthy Next Step'], layout:'six-grid', interpretationFamily:'relationship' },
  { id:'whole-self', name:'Six-Card Reflection', cards:6, available:true, duration:7, positions:['Current Reality','Underlying Influence','Main Friction','Available Strength','Helpful Adjustment','Practical Next Step'], layout:'six-grid', interpretationFamily:'deep-reflection' },
  { id:'seasonal-review', name:'Seasonal Review', cards:6, available:true, duration:7, positions:['What Is Ending','What Remains','Lesson to Carry','Resource Available','Intention to Set','Practical Next Step'], layout:'six-grid', interpretationFamily:'seasonal' },
  { id:'celtic-cross-classic', name:'Celtic Cross', cards:10, available:true, duration:12, positions:['Present Situation','Challenge','Foundation','Recent Past','Possibility','Near Development','Your Approach','External Influences','Hopes & Fears','Direction'], layout:'celtic-cross', interpretationFamily:'celtic-cross' },
  { id:'celtic-cross-reflective', name:'Celtic Cross (Reflective)', cards:10, available:true, duration:12, positions:['Current Awareness','Central Tension','Underlying Pattern','What Is Receding','Emerging Possibility','Near-Term Practice','Your Stance','Surrounding Context','Hope & Concern','Reflective Direction'], layout:'celtic-cross', interpretationFamily:'celtic-cross' }
]);

export const spreadById = new Map(SPREADS.map(spread => [spread.id, spread]));

const zh = new Map([
  ['general-reflection',['综合反思',['背景','核心','建议']]],
  ['relationship-reflection',['关系反思',['你的视角','共同状态','健康的下一步']]],
  ['work-direction',['工作与方向',['当前现实','阻力','务实的下一步']]],
  ['decision-clarity',['决策澄清',['重要因素','复杂因素','下一步']]],
  ['daily-reflection',['每日一牌',['今日主题']]],['single-focus',['一张牌反思',['当前焦点']]],
  ['past-present-next',['过去、现在与下一步',['过去的影响','当前现实','下一步发展']]],
  ['mind-body-spirit',['心智、身体与精神',['心智','身体与现实','内在精神']]],
  ['creative-block',['创作阻碍',['火花','阻碍','实验']]],
  ['relationship-check-in',['关系检视',['你的视角','可观察的互动','未表达的需要','需要尊重的边界','可用的支持','健康的下一步']]],['whole-self',['六张牌深度反思',['当前现实','深层影响','主要阻力','可用力量','有益调整','务实的下一步']]],
  ['seasonal-review',['阶段回顾',['正在结束的事','仍会留下的事','值得带走的经验','可用的资源','想要确立的意图','务实的下一步']]],['celtic-cross-classic',['凯尔特十字',['当前处境','主要挑战','深层基础','近期过去','潜在可能','近期发展','你的态度','外部影响','希望与担忧','整体方向']]],
  ['celtic-cross-reflective',['反思型凯尔特十字',['当前觉察','核心张力','深层模式','正在退去的影响','浮现的可能','近期练习','你的立场','周围环境','希望与顾虑','反思方向']]]
]);

export function localizedSpread(spread,locale='en'){
  if(locale!=='zh-CN')return spread;
  const [name,positions]=zh.get(spread.id);
  return {...spread,name,positions};
}

export function localizedSpreads(locale='en'){
  return SPREADS.map(spread=>localizedSpread(spread,locale));
}
