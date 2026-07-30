export const DATASET = Object.freeze({
  id: 'calibration-rws-zh', version: '0.1.0', tradition: 'Rider–Waite–Smith',
  language: 'zh-CN', license: 'project-authored calibration summaries'
});

const raw = [
  ['fool','愚者','major',0,'air',['开始','开放','尝试'],['冲动','迟疑','准备不足'],'允许一次范围可控的新尝试。','先补足准备，再决定是否跨出这一步。'],
  ['magician','魔术师','major',1,'air',['主动','资源','表达'],['分散','操控','能力未用'],'盘点现有资源，并主动把意图变成一个动作。','收拢注意力，避免只靠话术或强推。'],
  ['high-priestess','女祭司','major',2,'water',['观察','直觉','未明信息'],['封闭','忽略信号','猜测'],'先观察尚未说出口的信息，不急着定论。','区分直觉与焦虑，用事实核对感受。'],
  ['empress','皇后','major',3,'earth',['滋养','成长','创造'],['透支','依赖','停滞'],'给重要关系或项目持续而实际的照料。','先恢复自己的资源，避免用过度付出来换安全感。'],
  ['emperor','皇帝','major',4,'fire',['结构','边界','负责'],['僵化','控制','边界混乱'],'明确规则、责任和可执行边界。','检查控制是否替代了沟通，重建合理边界。'],
  ['lovers','恋人','major',6,'air',['选择','一致','关系'],['失衡','价值冲突','回避选择'],'让选择与核心价值一致，并坦诚沟通。','先说清价值冲突，不用拖延假装问题不存在。'],
  ['chariot','战车','major',7,'water',['方向','意志','推进'],['失控','急进','方向分裂'],'选定方向，用节奏和边界推进。','暂停拉扯，先统一目标再加速。'],
  ['strength','力量','major',8,'fire',['耐心','勇气','温和坚定'],['自我怀疑','压抑','逞强'],'以温和而持续的方式处理压力。','承认脆弱，减少逞强，寻找可承受的下一步。'],
  ['hermit','隐士','major',9,'earth',['独处','审视','内在指引'],['孤立','过度分析','拒绝支持'],'留出安静空间，审视真正需要。','避免把反思变成隔绝，向可信任的人求证。'],
  ['wheel','命运之轮','major',10,'fire',['周期','变化','转机'],['反复','抗拒变化','时机未熟'],'识别正在变化的周期，并保留调整空间。','先处理反复出现的模式，不把一切归因于运气。'],
  ['justice','正义','major',11,'air',['事实','责任','平衡'],['偏见','逃避责任','信息不全'],'基于事实和责任做判断，记录依据。','补齐信息并检查偏见；重大决定咨询合格专业人士。'],
  ['death','死神','major',13,'water',['结束','转化','释放'],['拖延结束','抗拒转化','停滞'],'它象征阶段转换而非字面死亡；辨认需要结束的旧模式。','不要把变化灾难化，逐步放下已不再适用的部分。']
];

export const cards = Object.freeze(raw.map(([id,name,arcana,number,element,upright,reversed,uprightMeaning,reversedMeaning]) => Object.freeze({
  id,name,arcana,number,element,upright:Object.freeze(upright),reversed:Object.freeze(reversed),uprightMeaning,reversedMeaning,dataset:DATASET.id
})));
export const cardById = new Map(cards.map(card => [card.id, card]));
