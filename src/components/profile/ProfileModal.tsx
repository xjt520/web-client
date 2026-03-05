import { useState } from 'react'
import { AvatarSelector } from './AvatarSelector'
import { NicknameEditor } from './NicknameEditor'
import { LevelDisplay } from './LevelDisplay'
import { MatchHistory } from './MatchHistory'
import { ScoreHistoryList } from './ScoreHistoryList'
import type { UserProfile, User, UserSettings, MatchRecord, ScoreHistory as ScoreHistoryType } from '../../module_bindings/types'

interface ProfileModalProps {
  profile: UserProfile | null
  user: User | null
  settings: UserSettings | null
  matchRecords: MatchRecord[]
  scoreHistory: ScoreHistoryType[]
  onClose: () => void
  onUpdateAvatar: (emoji: string) => Promise<void>
  onUpdateNickname: (nickname: string) => Promise<void>
  onUpdateSettings: (settings: Partial<{
    soundEnabled: boolean
    musicEnabled: boolean
    animationEnabled: boolean
    cardSortOrder: 'asc' | 'desc'
  }>) => Promise<void>
}

type Tab = 'info' | 'history' | 'scores'

export function ProfileModal({
  profile,
  user,
  settings,
  matchRecords,
  scoreHistory,
  onClose,
  onUpdateAvatar,
  onUpdateNickname,
  onUpdateSettings,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [isEditingNickname, setIsEditingNickname] = useState(false)

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">个人中心</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签栏 */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'info', label: '个人信息' },
            { key: 'history', label: '对局记录' },
            { key: 'scores', label: '积分明细' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* 头像和等级 */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setIsEditingAvatar(true)}
                  className="relative group"
                >
                  <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-4xl">
                    {profile?.avatarEmoji || '😀'}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs">更换头像</span>
                  </div>
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-lg font-medium">{user.name}</span>
                    <button
                      onClick={() => setIsEditingNickname(true)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <LevelDisplay score={user.score} />
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{user.totalGames}</div>
                  <div className="text-gray-400 text-sm">总场次</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{user.wins}</div>
                  <div className="text-gray-400 text-sm">胜利</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0}%
                  </div>
                  <div className="text-gray-400 text-sm">胜率</div>
                </div>
              </div>

              {/* 设置 */}
              {settings && (
                <div className="space-y-4">
                  <h3 className="text-white font-medium">设置</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">音效</span>
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">背景音乐</span>
                      <input
                        type="checkbox"
                        checked={settings.musicEnabled}
                        onChange={(e) => onUpdateSettings({ musicEnabled: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">动画效果</span>
                      <input
                        type="checkbox"
                        checked={settings.animationEnabled}
                        onChange={(e) => onUpdateSettings({ animationEnabled: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">手牌排序</span>
                      <select
                        value={settings.cardSortOrder}
                        onChange={(e) => onUpdateSettings({ cardSortOrder: e.target.value as 'asc' | 'desc' })}
                        className="bg-gray-700 text-white rounded px-3 py-1"
                      >
                        <option value="asc">从小到大</option>
                        <option value="desc">从大到小</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <MatchHistory records={matchRecords} />
          )}

          {activeTab === 'scores' && (
            <ScoreHistoryList history={scoreHistory} />
          )}
        </div>
      </div>

      {/* 头像选择弹窗 */}
      {isEditingAvatar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <AvatarSelector
            currentAvatar={profile?.avatarEmoji || '😀'}
            onSelect={async (emoji) => {
              await onUpdateAvatar(emoji)
              setIsEditingAvatar(false)
            }}
            onCancel={() => setIsEditingAvatar(false)}
          />
        </div>
      )}

      {/* 昵称编辑弹窗 */}
      {isEditingNickname && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <NicknameEditor
            currentNickname={user.name}
            nicknameUpdatedAt={profile?.nicknameUpdatedAt}
            onSave={async (nickname) => {
              await onUpdateNickname(nickname)
              setIsEditingNickname(false)
            }}
            onCancel={() => setIsEditingNickname(false)}
          />
        </div>
      )}
    </div>
  )
}
