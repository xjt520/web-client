import { useCallback, useRef, useEffect } from 'react'
import { QUICK_CHAT_MESSAGES } from '../../lib/emotes'
import type { QuickChatMessage } from '../../lib/emotes'
import './QuickChat.css'

interface QuickChatProps {
  position: { x: number; y: number }
  onSelect: (message: QuickChatMessage) => void
  onClose: () => void
}

export function QuickChat({ position, onSelect, onClose }: QuickChatProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleItemClick = useCallback(
    (msg: QuickChatMessage) => {
      onSelect(msg)
      onClose()
    },
    [onSelect, onClose]
  )

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
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
      ref={listRef}
      className="quick-chat"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y - 20}px`,
        zIndex: 1000,
      }}
    >
      <div className="quick-chat-header">
        <span className="text-xs text-gray-300">快捷语</span>
        <button
          className="text-xs text-gray-400 hover:text-gray-300"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="quick-chat-list">
        {QUICK_CHAT_MESSAGES.map((msg) => (
          <button
            key={msg.text}
            className="quick-chat-item"
            onClick={() => handleItemClick(msg)}
          >
            <span className="text-sm">{msg.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
