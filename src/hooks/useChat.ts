import { useState, useCallback, useEffect } from 'react'
import { EmojiType, getEmojiIcon, getQuickChatByText } from '../lib/emotes'
import { soundManager } from '../lib/SoundManager'
import type { DbConnection } from '../lib/spacetime'
import type { ChatMessage as SpacetimeDBChatMessage } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

/**
 * 聊天消息类型
 */
export interface ChatMessage {
  id: string
  roomId: string
  senderIdentity: string
  senderName: string
  type: 'emoji' | 'text'
  content: string
  emojiType?: EmojiType
  timestamp: number
}

/**
 * 聊天 Hook 返回值
 */
export interface UseChatReturn {
  messages: ChatMessage[]
  sendChatMessage: (messageType: 'emoji' | 'text', content: string) => void
}

/**
 * 将 SpacetimeDB 聊天消息转换为本地格式
 * 表情消息的 content 字段存储 EmojiType 字符串值（如 'happy'）
 */
function convertMessage(msg: SpacetimeDBChatMessage): ChatMessage {
  const type = msg.messageType === 'emoji' ? 'emoji' : 'text'
  const emojiType = type === 'emoji' ? (msg.content as EmojiType) : undefined
  return {
    id: msg.id.toString(),
    roomId: msg.roomId.toString(),
    senderIdentity: msg.senderIdentity.toHexString(),
    senderName: msg.senderName,
    type,
    content: type === 'emoji' && emojiType ? getEmojiIcon(emojiType) : msg.content,
    emojiType,
    timestamp: Number(msg.createdAt.microsSinceUnixEpoch) / 1000,
  }
}

/**
 * 聊天 Hook - 通过 SpacetimeDB 同步房间内聊天消息（表情和快捷语）
 *
 * @param getConnection - 获取 DbConnection 的函数
 * @param roomId - 当前房间 ID
 */
export function useChat(
  getConnection: () => DbConnection | null,
  roomId: bigint
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const conn = getConnection()

  // 订阅 SpacetimeDB chat_message 表的插入和删除事件
  useEffect(() => {
    if (!conn) return

    const db = conn.db

    db.chat_message.onInsert((_ctx: EventContext, msg: SpacetimeDBChatMessage) => {
      if (msg.roomId !== roomId) return
      const convertedMsg = convertMessage(msg)
      setMessages((prev) => [...prev, convertedMsg])
      
      // 如果是其他玩家发送的快捷语消息，播放对应的语音
      // 自己的消息在 GameTable 的 handleSelectQuickChat 中已经播放过了
      const isOwnMessage = conn.identity && msg.senderIdentity.toHexString() === conn.identity.toHexString()
      if (!isOwnMessage && convertedMsg.type === 'text') {
        const quickChat = getQuickChatByText(msg.content)
        if (quickChat?.soundFile) {
          soundManager.playQuickChatSound(quickChat.soundFile)
        }
      }
    })

    db.chat_message.onDelete((_ctx: EventContext, msg: SpacetimeDBChatMessage) => {
      const msgId = msg.id.toString()
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
    })
  }, [conn, roomId])

  /**
   * 通过 SpacetimeDB reducer 发送聊天消息
   * 表情消息传入 EmojiType 值作为 content（如 'happy'）
   * 文本消息传入快捷语文本作为 content
   */
  const sendChatMessage = useCallback(
    (messageType: 'emoji' | 'text', content: string) => {
      const currentConn = getConnection()
      if (!currentConn) return
      currentConn.reducers.sendChatMessage({ roomId, messageType, content })
    },
    [getConnection, roomId]
  )

  return {
    messages,
    sendChatMessage,
  }
}
