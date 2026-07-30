export function safetyFor(context) {
  const notices = ['本解读用于自我反思，不保证未来结果。'];
  if (context.highStakes) notices.push(`问题涉及 ${context.category}，塔罗不能替代合格专业人士的判断；请把建议限制为整理问题、记录事实和寻求专业帮助。`);
  return Object.freeze(notices);
}

export function safeActions(context) {
  const actions = ['写下一个你能在 48 小时内完成、且可撤销的小步骤。','列出支持与反对当前判断的各两条事实。'];
  if (context.highStakes) actions.unshift('在采取重大或不可逆行动前，咨询对应领域的合格专业人士。');
  return Object.freeze(actions);
}
