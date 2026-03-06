import { useState, useEffect } from 'react'
import { RoomList } from './RoomList'
import { CreateRoomModal } from './CreateRoomModal'
import { QuickMatchButton } from './QuickMatchButton'
import { UserProfileSummary } from './UserProfileSummary'
import { ToastContainer } from '../common/ToastContainer'
import { useToast } from '../../hooks/useToast'
import { useUserProfile } from '../../hooks/useUserProfile'
import { useMatchQueue } from '../../hooks/useMatchQueue'
import { useSettings } from '../../hooks/useSettings'
import { useGame } from '../../hooks/useGame'
import { useMatchHistory } from '../../hooks/useMatchHistory'
import { ProfileModal } from '../profile/ProfileModal'
import { SettingsModal } from '../settings/SettingsModal'
import { RulesModal } from '../rules/RulesModal'
import type { DbConnection } from '../../lib/spacetime'

interface LobbyLayoutProps {
  userName: string
  onLogout: () => void
  getConnection: () => DbConnection | null
}

export function LobbyLayout({ onLogout, getConnection }: LobbyLayoutProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAiRoomModal, setShowAiRoomModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showRoomExistsModal, setShowRoomExistsModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<'create' | 'ai' | null>(null)

  const { toasts, removeToast, error, success } = useToast()
  const { profile, user, settings } = useUserProfile(getConnection)
  const { isMatching, matchTime, matchedRoomId, error: matchError, joinQueue, leaveQueue } = useMatchQueue(getConnection)
  const { updateSettings } = useSettings(getConnection)
  const { currentRoom, gameStatus } = useGame(getConnection)
  const { matchRecords, scoreHistory } = useMatchHistory(getConnection)

  // 处理匹配成功
  useEffect(() => {
    if (matchedRoomId !== null) {
      success('匹配成功，正在进入房间...')
    }
  }, [matchedRoomId, success])

  // 处理匹配错误
  useEffect(() => {
    if (matchError) {
      error(matchError)
    }
  }, [matchError, error])

  const handleLogout = () => {
    const conn = getConnection()
    if (conn) {
      try {
        conn.reducers.leave({})
      } catch (e) {
        console.error('Leave error:', e)
      }
    }
    onLogout()
  }

  const handleError = (errorMessage: string) => {
    error(errorMessage)
  }

  // 检查是否已在房间中
  const checkAndCreateRoom = (action: 'create' | 'ai') => {
    if (currentRoom) {
      // 已在房间中，显示提示
      setPendingAction(action)
      setShowRoomExistsModal(true)
    } else {
      // 不在房间中，直接创建
      if (action === 'create') {
        setShowCreateModal(true)
      } else {
        setShowAiRoomModal(true)
      }
    }
  }

  // 离开当前房间并创建新房间
  const handleLeaveAndCreate = () => {
    const conn = getConnection()
    if (!conn || !currentRoom) return

    try {
      conn.reducers.leaveRoom({ roomId: currentRoom.id })
      setShowRoomExistsModal(false)
      // 稍后创建新房间
      setTimeout(() => {
        if (pendingAction === 'create') {
          setShowCreateModal(true)
        } else {
          setShowAiRoomModal(true)
        }
        setPendingAction(null)
      }, 500)
    } catch (err) {
      error(err instanceof Error ? err.message : '离开房间失败')
    }
  }

  // 返回当前房间（进入观战模式）
  const handleReturnToRoom = () => {
    setShowRoomExistsModal(false)
    setPendingAction(null)
    // App.tsx 会自动根据 currentRoom 状态显示游戏界面
  }

  const handleUpdateAvatar = async (emoji: string) => {
    const conn = getConnection()
    if (!conn) return

    try {
      conn.reducers.updateAvatar({ avatarEmoji: emoji })
      success('头像更新成功')
    } catch (err) {
      error(err instanceof Error ? err.message : '更新头像失败')
      throw err
    }
  }

  const handleUpdateNickname = async (nickname: string) => {
    const conn = getConnection()
    if (!conn) return

    try {
      conn.reducers.updateNickname({ nickname })
      success('昵称更新成功')
    } catch (err) {
      error(err instanceof Error ? err.message : '更新昵称失败')
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-gray-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* 头部 */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">🃏 斗地主</h1>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* 用户信息 */}
            <UserProfileSummary
              profile={profile}
              user={user}
              onClick={() => setShowProfileModal(true)}
            />

            {/* 规则按钮 */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-2 sm:px-3 sm:py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors touch:manipulation"
              title="游戏规则"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 sm:px-3 sm:py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors touch:manipulation"
              title="设置"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* 退出按钮 */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm sm:text-base touch:manipulation"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* 匹配区域 */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* 随机匹配 */}
              <QuickMatchButton
                onJoinQueue={joinQueue}
                isMatching={isMatching}
                matchTime={matchTime}
                matchedRoomId={matchedRoomId}
                error={matchError}
                onLeaveQueue={leaveQueue}
              />

              {/* 创建房间 */}
              <button
                onClick={() => checkAndCreateRoom('create')}
                disabled={isMatching}
                className={`
                  w-full py-4 sm:py-4 px-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg
                  transition-all duration-200 transform
                  ${isMatching
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 active:scale-98 sm:hover:scale-105'
                  }
                  text-white shadow-lg touch:manipulation
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  好友建房
                </span>
              </button>

              {/* 人机对战 */}
              <button
                onClick={() => checkAndCreateRoom('ai')}
                disabled={isMatching}
                className={`
                  w-full py-4 sm:py-4 px-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg
                  transition-all duration-200 transform
                  ${isMatching
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 active:scale-98 sm:hover:scale-105'
                  }
                  text-white shadow-lg touch:manipulation
                `}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-xl">🤖</span>
                  人机对战
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 房间列表 */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl text-white">房间列表</h2>
        </div>

        <RoomList
          getConnection={getConnection}
          onError={handleError}
        />
      </main>

      {/* 弹窗 */}
      {showCreateModal && (
        <CreateRoomModal
          getConnection={getConnection}
          onClose={() => setShowCreateModal(false)}
          onError={handleError}
          isAiMode={false}
        />
      )}

      {showAiRoomModal && (
        <CreateRoomModal
          getConnection={getConnection}
          onClose={() => setShowAiRoomModal(false)}
          onError={handleError}
          isAiMode={true}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          profile={profile}
          user={user}
          settings={settings}
          matchRecords={matchRecords}
          scoreHistory={scoreHistory}
          onClose={() => setShowProfileModal(false)}
          onUpdateAvatar={handleUpdateAvatar}
          onUpdateNickname={handleUpdateNickname}
          onUpdateSettings={updateSettings}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showRulesModal && (
        <RulesModal onClose={() => setShowRulesModal(false)} />
      )}

      {/* 已在房间中的提示弹窗 */}
      {showRoomExistsModal && currentRoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-xl font-bold text-white mb-4">您已在房间中</h3>
            <p className="text-gray-300 mb-2">
              房间: <span className="text-white font-medium">{currentRoom.name}</span>
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {gameStatus === 'waiting'
                ? '房间正在等待玩家准备...'
                : gameStatus === 'finished'
                ? '游戏已结束，等待重新开始...'
                : '游戏正在进行中...'}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleReturnToRoom}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {gameStatus === 'waiting' ? '进入房间' : gameStatus === 'finished' ? '查看结果' : '返回游戏'}
              </button>
              <button
                onClick={handleLeaveAndCreate}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
              >
                离开并创建新房间
              </button>
              <button
                onClick={() => {
                  setShowRoomExistsModal(false)
                  setPendingAction(null)
                }}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
