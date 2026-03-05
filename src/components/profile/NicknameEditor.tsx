import { useState } from 'react'

interface NicknameEditorProps {
  currentNickname: string
  nicknameUpdatedAt: { microsSinceUnixEpoch: bigint } | null | undefined
  onSave: (nickname: string) => Promise<void>
  onCancel: () => void
}

const NICKNAME_COOLDOWN_DAYS = 30

export function NicknameEditor({
  currentNickname,
  nicknameUpdatedAt,
  onSave,
  onCancel,
}: NicknameEditorProps) {
  const [nickname, setNickname] = useState(currentNickname)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 检查是否在冷却期
  const checkCooldown = (): number => {
    if (!nicknameUpdatedAt || !nicknameUpdatedAt.microsSinceUnixEpoch) return 0

    const updatedAtMs = Number(nicknameUpdatedAt.microsSinceUnixEpoch) / 1000
    const nowMs = Date.now()
    const daysSinceUpdate = (nowMs - updatedAtMs) / (24 * 60 * 60 * 1000)

    return Math.max(0, Math.ceil(NICKNAME_COOLDOWN_DAYS - daysSinceUpdate))
  }

  const remainingDays = checkCooldown()
  const canEdit = remainingDays === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!canEdit) {
      setError(`昵称修改冷却中，还需等待${remainingDays}天`)
      return
    }

    const trimmed = nickname.trim()
    if (trimmed.length < 1 || trimmed.length > 12) {
      setError('昵称长度需要在1-12个字符之间')
      return
    }

    if (trimmed === currentNickname) {
      onCancel()
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-4">修改昵称</h3>

      {!canEdit && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-sm">
            昵称修改冷却中，还需等待 <strong>{remainingDays}</strong> 天
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={!canEdit || isSaving}
          maxLength={12}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
          placeholder="请输入新昵称"
        />

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}

        <p className="text-gray-400 text-xs mt-2">
          每月只能修改一次昵称
        </p>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!canEdit || isSaving}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
