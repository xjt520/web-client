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
  id: number
  text: string
  emojiType: EmojiType
  soundFile: string
}

/**
 * 快捷语列表 - 提供更高的情绪价值
 */
export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  // 催促/等待
  { id: 1, text: '风起云涌，静候出招~', emojiType: EmojiType.Happy, soundFile: '/sounds/quick_chat/01.mp3' },
  // 赞美/惊叹
  { id: 2, text: '神级操作，学到了！', emojiType: EmojiType.ThumbUp, soundFile: '/sounds/quick_chat/02.mp3' },
  { id: 3, text: '666，太秀了！', emojiType: EmojiType.Rocket, soundFile: '/sounds/quick_chat/03.mp3' },
  { id: 4, text: '厉害了，佩服！', emojiType: EmojiType.Clap, soundFile: '/sounds/quick_chat/04.mp3' },
  { id: 5, text: '牌神附体啊！', emojiType: EmojiType.Surprised, soundFile: '/sounds/quick_chat/05.mp3' },
  { id: 6, text: '妙啊，这波太秀了！', emojiType: EmojiType.Clap, soundFile: '/sounds/quick_chat/06.mp3' },
  // 鼓励/自信
  { id: 7, text: '稳住，能赢！', emojiType: EmojiType.Victory, soundFile: '/sounds/quick_chat/07.mp3' },
  { id: 8, text: '队友给力！', emojiType: EmojiType.ThumbUp, soundFile: '/sounds/quick_chat/08.mp3' },
  // 挑战/再来
  { id: 9, text: '棋逢对手，再来一局！', emojiType: EmojiType.Victory, soundFile: '/sounds/quick_chat/09.mp3' },
  { id: 10, text: '再来一局！不服！', emojiType: EmojiType.Angry, soundFile: '/sounds/quick_chat/10.mp3' },
  { id: 11, text: '我要验牌！', emojiType: EmojiType.Sweat, soundFile: '/sounds/quick_chat/11.mp3' },
  { id: 12, text: '牌没有问题！', emojiType: EmojiType.Sweat, soundFile: '/sounds/quick_chat/12.mp3' },
  { id: 13, text: '给我擦皮鞋！', emojiType: EmojiType.Sweat, soundFile: '/sounds/quick_chat/13.mp3' },
  // 幽默/调侃
  { id: 14, text: '别急，让我想想...', emojiType: EmojiType.Thinking, soundFile: '/sounds/quick_chat/14.mp3' },
  { id: 15, text: '这牌我自己都笑了', emojiType: EmojiType.Sweat, soundFile: '/sounds/quick_chat/15.mp3' },
  // 告别
  { id: 16, text: '江湖路远，后会有期！', emojiType: EmojiType.Rocket, soundFile: '/sounds/quick_chat/16.mp3' },
]

/**
 * 根据文本获取快捷语消息
 */
export function getQuickChatByText(text: string): QuickChatMessage | undefined {
  return QUICK_CHAT_MESSAGES.find(msg => msg.text === text)
}

/**
 * 表情动画持续时间（毫秒）
 */
export const EMOTE_ANIMATION_DURATION = 300

/**
 * 表情显示延迟消失时间（毫秒）
 */
export const EMOTE_DISPLAY_DELAY = 2000
