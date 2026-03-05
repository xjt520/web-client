import { useState } from 'react'
import { getAvatarsByCategory } from '../../lib/emojiAvatars'

interface AvatarSelectorProps {
  currentAvatar: string
  onSelect: (emoji: string) => Promise<void>
  onCancel: () => void
}

export function AvatarSelector({ currentAvatar, onSelect, onCancel }: AvatarSelectorProps) {
  const [selected, setSelected] = useState(currentAvatar)
  const [isSaving, setIsSaving] = useState(false)

  const categories = getAvatarsByCategory()

  const handleConfirm = async () => {
    if (selected === currentAvatar) {
      onCancel()
      return
    }

    setIsSaving(true)
    try {
      await onSelect(selected)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-lg font-bold text-white mb-4">选择头像</h3>

      {/* 分类显示 */}
      <div className="space-y-4 max-h-80 overflow-y-auto mb-6">
        {Object.entries(categories).map(([category, emojis]) => (
          <div key={category}>
            <h4 className="text-sm text-gray-400 mb-2">{category}</h4>
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelected(emoji)}
                  className={`
                    w-10 h-10 flex items-center justify-center text-2xl rounded-lg
                    transition-all duration-200
                    ${selected === emoji
                      ? 'bg-blue-600 ring-2 ring-blue-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 自定义输入 */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-2 block">或输入自定义 Emoji</label>
        <input
          type="text"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 text-2xl text-center"
          maxLength={4}
        />
      </div>

      {/* 预览 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-4xl">
          {selected}
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSaving}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
        >
          {isSaving ? '保存中...' : '确认'}
        </button>
      </div>
    </div>
  )
}
