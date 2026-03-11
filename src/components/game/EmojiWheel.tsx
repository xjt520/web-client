import { useRef, useEffect } from 'react'
import { EmojiType, getEmojiText } from '../../lib/emotes'
import './EmojiWheel.css'

interface EmojiWheelProps {
  position: { x: number; y: number }
  onSelect: (emojiType: EmojiType) => void
  onClose: () => void
}

const EMOTES: { type: EmojiType; icon: string }[] = [
  { type: EmojiType.Happy, icon: '😄' },
  { type: EmojiType.Sad, icon: '😢' },
  { type: EmojiType.Angry, icon: '😠' },
  { type: EmojiType.Thinking, icon: '🤔' },
  { type: EmojiType.Surprised, icon: '😮' },
  { type: EmojiType.Clap, icon: '👏' },
  { type: EmojiType.ThumbUp, icon: '👍' },
  { type: EmojiType.Victory, icon: '✌' },
  { type: EmojiType.Rocket, icon: '🚀' },
  { type: EmojiType.Sweat, icon: '😅' },
]

export function EmojiWheel({ position, onSelect, onClose }: EmojiWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={wheelRef}
      className="emoji-wheel"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y - 100}px`,
        zIndex: 1000,
      }}
    >
      {EMOTES.map((emoji) => (
        <button
          key={emoji.type}
          className="emoji-item"
          onClick={() => {
            onSelect(emoji.type)
            onClose()
          }}
          title={getEmojiText(emoji.type)}
        >
          <span className="emoji-icon">{emoji.icon}</span>
        </button>
      ))}
    </div>
  )
}
