export function localeFrom(value='') {
  return String(value).toLowerCase().startsWith('zh')?'zh-CN':'en';
}

const errors={
  'Google sign-in is not configured.':'Google 登录尚未配置。','Invalid Google credential.':'Google 登录凭据无效。','Reveal cards before interpretation.':'请先翻牌，再进行解读。','Authentication required.':'需要登录。','Card not found.':'找不到这张牌。','Sign in to save a reading.':'请登录后保存解读。','Cards cannot be changed in this state.':'当前阶段不能更换牌。','Question must contain 1–200 characters.':'问题长度须为 1–200 个字符。','Reading session not found.':'找不到这次解读会话。','Select every required card before revealing.':'请选满所需牌数后再翻牌。','Selections must be unique deck indices.':'不能重复选择同一张牌。','Spread is not available.':'这个牌阵尚未开放。','The request could not be completed.':'暂时无法完成请求。'
};
export const localizedError=(message,locale)=>locale==='zh-CN'?(errors[message]||message):message;
