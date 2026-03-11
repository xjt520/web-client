/**
 * 表情和快捷语定义
 */

/**
 * 表情类型
 */
export enum EmojiType {
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Thinking = 'thinking',
  Surprised = 'surprised',
  Clap = 'clap',
  ThumbUp = 'thumbup',
  Victory = 'victory',
  Rocket = 'rocket',
  Sweat = 'sweat',
}

/**
 * 获取表情显示文字
 */
export function getEmojiText(type: EmojiType): string {
  switch (type) {
    case EmojiType.Happy:
      return '开心'
    case EmojiType.Sad:
      return '难过'
    case EmojiType.Angry:
      return '生气'
    case EmojiType.Thinking:
      return '思考'
    case EmojiType.Surprised:
      return '惊讶'
    case EmojiType.Clap:
      return '鼓掌'
    case EmojiType.ThumbUp:
      return '点赞'
    case EmojiType.Victory:
      return '胜利'
    case EmojiType.Rocket:
      return '666'
    case EmojiType.Sweat:
      return '流汗'
    default:
      return '?'
  }
}

/**
 * 获取表情图标
 */
export function getEmojiIcon(type: EmojiType): string {
  switch (type) {
    case EmojiType.Happy:
      return '😄'
    case EmojiType.Sad:
      return '😢'
    case EmojiType.Angry:
      return '😠'
    case EmojiType.Thinking:
      return '🤔'
    case EmojiType.Surprised:
      return '😮'
    case EmojiType.Clap:
      return '👏'
    case EmojiType.ThumbUp:
      return '👍'
    case EmojiType.Victory:
      return '✌'
    case EmojiType.Rocket:
      return '🚀'
    case EmojiType.Sweat:
      return '😅'
    default:
      return '?'
  }
}

/**
 * 快捷语消息
 */
export interface QuickChatMessage {
  text: string
  emojiType: EmojiType
}

/**
 * 快捷语列表 - 提供更高的情绪价值
 */
export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  // 催促/等待
  { text: '风起云涌，静候出招~', emojiType: EmojiType.Happy },
  // 赞美/惊叹
  { text: '神级操作，学到了！', emojiType: EmojiType.ThumbUp },
  { text: '666，太秀了！', emojiType: EmojiType.Rocket },
  { text: '厉害了，佩服！', emojiType: EmojiType.Clap },
  { text: '牌神附体啊！', emojiType: EmojiType.Surprised },
  { text: '妙啊，这波太秀了！', emojiType: EmojiType.Clap },
  // 鼓励/自信
  { text: '稳住，能赢！', emojiType: EmojiType.Victory },
  { text: '队友给力！', emojiType: EmojiType.ThumbUp },
  // 挑战/再来
  { text: '棋逢对手，再来一局！', emojiType: EmojiType.Victory },
  { text: '再来一局！不服！', emojiType: EmojiType.Angry },
  // 幽默/调侃
  { text: '别急，让我想想...', emojiType: EmojiType.Thinking },
  { text: '这牌我自己都笑了', emojiType: EmojiType.Sweat },
  // 告别
  { text: '江湖路远，后会有期！', emojiType: EmojiType.Rocket },
]

/**
 * 表情动画持续时间（毫秒）
 */
export const EMOTE_ANIMATION_DURATION = 300

/**
 * 表情显示延迟消失时间（毫秒）
 */
export const EMOTE_DISPLAY_DELAY = 2000
