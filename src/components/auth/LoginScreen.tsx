import { useState, useCallback } from 'react'
import type { DbConnection } from '../../lib/spacetime'

interface LoginScreenProps {
  onLogin: (name: string) => void
  getConnection: () => DbConnection | null
}

export function LoginScreen({ onLogin, getConnection }: LoginScreenProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (name.trim().length < 2) {
        setError('用户名至少需要2个字符')
        return
      }

      if (name.trim().length > 12) {
        setError('用户名不能超过12个字符')
        return
      }

      setIsSubmitting(true)

      const conn = getConnection()
      if (!conn) {
        setError('连接未建立')
        setIsSubmitting(false)
        return
      }

      try {
        conn.reducers.join({ name: name.trim() })
        onLogin(name.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : '登录失败')
        setIsSubmitting(false)
      }
    },
    [name, getConnection, onLogin]
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-gray-900">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🃏 斗地主</h1>
          <p className="text-gray-400">基于 SpacetimeDB 的实时对战游戏</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              输入您的昵称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="请输入昵称"
              maxLength={12}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? '登录中...' : '进入游戏'}
          </button>
        </form>
      </div>
    </div>
  )
}
