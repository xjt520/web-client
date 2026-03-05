import type { UserSettings } from '../../module_bindings/types'

interface SettingsModalProps {
  settings: UserSettings | null
  onUpdateSettings: (settings: Partial<{
    soundEnabled: boolean
    musicEnabled: boolean
    animationEnabled: boolean
    cardSortOrder: 'asc' | 'desc'
  }>) => Promise<void>
  onClose: () => void
}

export function SettingsModal({ settings, onUpdateSettings, onClose }: SettingsModalProps) {
  const handleToggle = async (key: keyof UserSettings, value: boolean | string) => {
    await onUpdateSettings({ [key]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 音效设置 */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">音效设置</h3>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">游戏音效</span>
                <p className="text-gray-500 text-xs mt-1">出牌、炸弹等音效</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.soundEnabled ?? true}
                onChange={(e) => handleToggle('soundEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">背景音乐</span>
                <p className="text-gray-500 text-xs mt-1">游戏背景音乐</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.musicEnabled ?? true}
                onChange={(e) => handleToggle('musicEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">动画效果</span>
                <p className="text-gray-500 text-xs mt-1">发牌动画等</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.animationEnabled ?? true}
                onChange={(e) => handleToggle('animationEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>

          {/* 界面设置 */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">界面设置</h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">手牌排序</span>
                <p className="text-gray-500 text-xs mt-1">默认排序方向</p>
              </div>
              <select
                value={settings?.cardSortOrder ?? 'asc'}
                onChange={(e) => handleToggle('cardSortOrder', e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2"
              >
                <option value="asc">从小到大</option>
                <option value="desc">从大到小</option>
              </select>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">版本</span>
              <span className="text-gray-500">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
