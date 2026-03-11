import { useEffect, useState } from 'react'
import type { ChatMessage } from '../../hooks/useChat'
import './ChatBubble.css'

interface ChatBubbleProps {
  message: ChatMessage
  senderName: string
  className?: string
  onAnimationEnd?: () => void
}

export function ChatBubble({ message, senderName, className = '', onAnimationEnd }: ChatBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)

  // 2秒后开始消失动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      // 动画结束后通知父组件
      setTimeout(() => {
        onAnimationEnd?.()
      }, 300)
    }, 2000)

    return () => clearTimeout(timer)
  }, [onAnimationEnd])

  if (!isVisible) return null

  return (
    <div className={`chat-bubble ${className}`}>
      <div className="bubble-sender text-xs text-gray-400">{senderName}</div>
      <div className="bubble-content">
        {message.type === 'emoji' ? (
          <span className="text-3xl">{message.content}</span>
        ) : (
          <span className="text-sm">{message.content}</span>
        )}
      </div>
    </div>
  )
}
