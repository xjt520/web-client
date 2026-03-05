import { useState, useCallback } from 'react'
import type { DbConnection } from '../../lib/spacetime'

interface CreateRoomModalProps {
  getConnection: () => DbConnection | null
  onClose: () => void
  onError: (error: string) => void
  isAiMode?: boolean  // 是否人机模式
}

export function CreateRoomModal({ getConnection, onClose, onError, isAiMode = false }: CreateRoomModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (name.trim().length < 2) {
        onError('房间名至少需要2个字符')
        return
      }

      if (name.trim().length > 20) {
        onError('房间名不能超过20个字符')
        return
      }

      setIsSubmitting(true)

      const conn = getConnection()
      if (!conn) {
        onError('连接未建立')
        setIsSubmitting(false)
        return
      }

      try {
        if (isAiMode) {
          // 创建人机房间
          await conn.reducers.createAiRoom({ name: name.trim() })
        } else {
          // 创建普通房间
          await conn.reducers.createRoom({ name: name.trim() })
        }
        onClose()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        onError(errorMessage)
        setIsSubmitting(false)
      }
    },
    [name, getConnection, onClose, onError, isAiMode]
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">
          {isAiMode ? '🤖 创建人机房间' : '创建房间'}
        </h2>

        {isAiMode && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-blue-300 text-sm">
              人机模式下，系统会自动添加2个AI玩家与您对战。
              AI会自动叫分、加倍和出牌。
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              房间名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder={isAiMode ? "人机对战房间" : "请输入房间名"}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2 text-white rounded-lg transition-colors disabled:bg-gray-600 ${
                isAiMode
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? '创建中...' : isAiMode ? '开始人机对战' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
