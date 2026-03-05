/**
 * Emoji 头像列表
 * 系统内置的可选 Emoji 头像
 */

export const EMOJI_AVATARS: string[] = [
  // 笑脸系列
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇',
  // 酷炫系列
  '😎', '🥳', '🤩', '😏', '😋', '🤗', '🤠',
  // 动物系列
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
  // 卡通系列
  '👻', '👽', '🤖', '🎃', '💀', '👹', '👺',
  // 幸运系列
  '🍀', '🌟', '⭐', '💫', '✨', '🎈', '🎉', '🎊', '🎁', '👑', '💎', '🔥', '💪', '🏆', '🥇',
  // 扑克相关
  '🃏', '🀄', '♠️', '♥️', '♦️', '♣️', '🎰', '🎲',
]

/**
 * 获取随机头像
 */
export function getRandomAvatar(): string {
  return EMOJI_AVATARS[Math.floor(Math.random() * EMOJI_AVATARS.length)]
}

/**
 * 验证是否为有效头像
 */
export function isValidAvatar(emoji: string): boolean {
  return EMOJI_AVATARS.includes(emoji) || emoji.length <= 4
}

/**
 * 按类别获取头像
 */
export function getAvatarsByCategory(): Record<string, string[]> {
  return {
    '笑脸': EMOJI_AVATARS.slice(0, 9),
    '酷炫': EMOJI_AVATARS.slice(9, 16),
    '动物': EMOJI_AVATARS.slice(16, 31),
    '卡通': EMOJI_AVATARS.slice(31, 38),
    '幸运': EMOJI_AVATARS.slice(38, 53),
    '扑克': EMOJI_AVATARS.slice(53),
  }
}
