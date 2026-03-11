import type { UserSettings } from '../../module_bindings/types'
import { getThemeList, type ThemeId } from '../../config/themes'

interface SettingsModalProps {
  settings: UserSettings | null
  onUpdateSettings: (settings: Partial<{
    soundEnabled: boolean
    musicEnabled: boolean
    animationEnabled: boolean
    cardSortOrder: 'asc' | 'desc'
    tableTheme: ThemeId
  }>) => Promise<void>
  onClose: () => void
}

export function SettingsModal({ settings, onUpdateSettings, onClose }: SettingsModalProps) {
  const handleToggle = async (key: keyof UserSettings, value: boolean | string) => {
    await onUpdateSettings({ [key]: value })
  }

  const themes = getThemeList()
  const currentTheme = settings?.tableTheme || 'classic'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] shadow-2xl flex flex-col safe-bottom">
        {/* 头部 */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* 音效设置 */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-white font-medium text-sm sm:text-base">音效设置</h3>

            <label className="flex items-center justify-between py-1">
              <div>
                <span className="text-gray-300 text-sm sm:text-base">游戏音效</span>
                <p className="text-gray-500 text-xs mt-0.5">出牌、炸弹等音效</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.soundEnabled ?? true}
                onChange={(e) => handleToggle('soundEnabled', e.target.checked)}
                className="w-5 h-5 rounded accent-yellow-500"
              />
            </label>

            <label className="flex items-center justify-between py-1">
              <div>
                <span className="text-gray-300 text-sm sm:text-base">背景音乐</span>
                <p className="text-gray-500 text-xs mt-0.5">游戏背景音乐</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.musicEnabled ?? true}
                onChange={(e) => handleToggle('musicEnabled', e.target.checked)}
                className="w-5 h-5 rounded accent-yellow-500"
              />
            </label>

            <label className="flex items-center justify-between py-1">
              <div>
                <span className="text-gray-300 text-sm sm:text-base">动画效果</span>
                <p className="text-gray-500 text-xs mt-0.5">发牌动画等</p>
              </div>
              <input
                type="checkbox"
                checked={settings?.animationEnabled ?? true}
                onChange={(e) => handleToggle('animationEnabled', e.target.checked)}
                className="w-5 h-5 rounded accent-yellow-500"
              />
            </label>
          </div>

          {/* 界面设置 */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-white font-medium text-sm sm:text-base">界面设置</h3>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-gray-300 text-sm sm:text-base">手牌排序</span>
                <p className="text-gray-500 text-xs mt-0.5">默认排序方向</p>
              </div>
              <select
                value={settings?.cardSortOrder ?? 'asc'}
                onChange={(e) => handleToggle('cardSortOrder', e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 min-w-[100px]"
              >
                <option value="asc">从小到大</option>
                <option value="desc">从大到小</option>
              </select>
            </div>
          </div>

          {/* 牌桌主题 */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-white font-medium text-sm sm:text-base">牌桌主题</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleToggle('tableTheme', theme.id)}
                  className={`relative p-2 sm:p-3 rounded-xl border-2 transition-all active:scale-95 ${
                    currentTheme === theme.id
                      ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div
                    className={`h-10 sm:h-12 rounded-lg bg-gradient-to-br ${theme.background.gradient} mb-1.5 sm:mb-2 flex items-center justify-center`}
                  >
                    <div
                      className="w-7 h-9 sm:w-8 sm:h-10 rounded border-2 shadow-lg"
                      style={{
                        backgroundColor: theme.card.backColor,
                        borderColor: theme.card.borderColor,
                      }}
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs sm:text-sm font-medium">{theme.name}</div>
                    <div className="text-gray-400 text-[10px] sm:text-xs">{theme.description}</div>
                  </div>
                  {currentTheme === theme.id && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 版本信息 */}
          <div className="pt-3 sm:pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-400">版本</span>
              <span className="text-gray-500">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 sm:py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
