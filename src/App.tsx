import { useSpacetimeDB } from 'spacetimedb/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { ConnectionStatus } from './components/auth/ConnectionStatus'
import { LoginScreen } from './components/auth/LoginScreen'
import { LobbyLayout } from './components/lobby/LobbyLayout'
import { WaitingRoom } from './components/lobby/WaitingRoom'
import { GameTable } from './components/game/GameTable'
import { GameEndTransitionDemo } from './components/game/GameEndTransitionDemo'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useGame } from './hooks/useGame'
import { useSettings } from './hooks/useSettings'
import { useAudio } from './hooks/useAudio'
import type { DbConnection } from './lib/spacetime'
import type { User } from './module_bindings/types'

// 获取环境变量
const STDB_URI = import.meta.env.VITE_STDB_URI || 'ws://localhost:3000'
const STDB_MODULE = import.meta.env.VITE_STDB_MODULE || 'doudizhu-game'

export default function App() {
  // 演示模式检测
  const isDemoMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('demo') === 'transition'

  const { isActive, connectionError, getConnection } = useSpacetimeDB()
  const [userName, setUserName] = useLocalStorage<string | null>('doudizhu_username', null)
  const [lastRoomId, setLastRoomId] = useLocalStorage<string | null>('doudizhu_last_room', null)
  const { currentRoom, gameStatus, latestNotification } = useGame(getConnection as () => DbConnection | null)
  const [showNotification, setShowNotification] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null)

  // 音频设置
  const { soundEnabled, musicEnabled, tableTheme } = useSettings(getConnection as () => DbConnection | null)
  const audio = useAudio(soundEnabled, musicEnabled)
  const [audioInitialized, setAudioInitialized] = useState(false)

  // 使用 ref 追踪上一次的游戏状态，避免重复触发
  const prevGameStateRef = useRef<{ room: string | null; status: string }>({ room: null, status: '' })

  // 初始化音频（需要用户交互后）
  const initializeAudio = useCallback(() => {
    if (!audioInitialized) {
      audio.initialize()
      setAudioInitialized(true)
    }
  }, [audio, audioInitialized])

  // 显示系统通知
  useEffect(() => {
    if (latestNotification) {
      setShowNotification(true)
      const timer = setTimeout(() => setShowNotification(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [latestNotification])

  // 页面加载时打印数据库连接信息
  useEffect(() => {
    console.log('========================================')
    console.log('SpacetimeDB 连接信息:')
    console.log('  数据库地址:', STDB_URI)
    console.log('  数据库名称:', STDB_MODULE)
    console.log('========================================')
  }, [])

  // 保存当前房间ID到本地存储（用于断线重连）
  useEffect(() => {
    if (currentRoom) {
      setLastRoomId(currentRoom.id.toString())
    } else if (gameStatus === 'waiting' && !currentRoom) {
      // 离开房间时清除
      setLastRoomId(null)
    }
  }, [currentRoom, gameStatus, setLastRoomId])

  // 检查用户是否在数据库中存在，如果不存在则重新注册
  useEffect(() => {
    if (!isActive || !userName) return

    const conn = getConnection() as DbConnection | null
    if (!conn || !conn.identity) return

    // 检查用户是否存在
    const users = Array.from(conn.db.user.iter()) as unknown as User[]
    const userExists = users.some(
      (u) => u.identity.toHexString() === conn.identity!.toHexString()
    )

    if (!userExists) {
      // 用户不存在，重新注册
      setIsReconnecting(true)
      setReconnectMessage('正在恢复用户状态...')
      console.log('User not found in database, re-registering...')
      try {
        conn.reducers.join({ name: userName })
        // 等待一小段时间让状态同步
        setTimeout(() => {
          setIsReconnecting(false)
          setReconnectMessage(null)
          // 如果之前在房间中，提示用户
          if (lastRoomId) {
            setReconnectMessage('已恢复连接，正在同步游戏状态...')
            setTimeout(() => setReconnectMessage(null), 3000)
          }
        }, 500)
      } catch (err) {
        console.error('Failed to re-register user:', err)
        setIsReconnecting(false)
        setReconnectMessage(null)
        // 如果注册失败，清除本地存储的用户名
        setUserName(null)
      }
    } else {
      // 用户已存在，如果之前在房间中，检查是否需要重连
      if (lastRoomId && isReconnecting === false) {
        setReconnectMessage('已恢复连接')
        setTimeout(() => setReconnectMessage(null), 2000)
      }
    }
  }, [isActive, userName, getConnection, setUserName, lastRoomId])

  // 判断当前是否应该播放游戏音乐
  const shouldPlayGameMusic = useCallback(() => {
    return currentRoom && (gameStatus === 'bidding' || gameStatus === 'doubling' || gameStatus === 'playing')
  }, [currentRoom, gameStatus])

  // 根据游戏状态切换背景音乐（仅在游戏中播放）
  useEffect(() => {
    if (!audioInitialized || !musicEnabled) return

    const roomId = currentRoom?.id?.toString() || null
    const prev = prevGameStateRef.current

    // 检查状态是否真的变化了
    const stateChanged = prev.room !== roomId || prev.status !== gameStatus
    if (!stateChanged) return

    // 更新 ref
    prevGameStateRef.current = { room: roomId, status: gameStatus }

    // 只在游戏进行中（叫分、加倍、出牌阶段）播放背景音乐
    if (shouldPlayGameMusic()) {
      audio.playGameMusic()
    } else {
      // 其他情况（大厅、等待室、游戏结束）停止音乐
      audio.stopMusic()
    }
  }, [currentRoom, gameStatus, audioInitialized, musicEnabled, audio, shouldPlayGameMusic])

  // 当 musicEnabled 变化时，根据当前游戏状态决定播放或停止
  useEffect(() => {
    if (!audioInitialized) return

    if (musicEnabled && shouldPlayGameMusic()) {
      audio.playGameMusic()
    } else {
      audio.stopMusic()
    }
  }, [musicEnabled, audioInitialized, audio, shouldPlayGameMusic])

  if (!isActive) {
    return <ConnectionStatus error={connectionError?.message ?? null} onRetry={() => window.location.reload()} />
  }

  // 重连状态提示
  if (isReconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-green-500 border-r-green-500"></div>
          </div>
          <p className="text-white font-medium mb-1">{reconnectMessage || '正在恢复连接...'}</p>
          <p className="text-gray-400 text-sm">请稍候</p>
        </div>
      </div>
    )
  }

  // 演示模式：显示过渡动画演示页面
  if (isDemoMode) {
    return (
      <GameEndTransitionDemo 
        onBack={() => {
          window.location.href = window.location.pathname
        }}
      />
    )
  }

  if (!userName) {
    return (
      <LoginScreen
        onLogin={setUserName}
        getConnection={() => getConnection() as DbConnection | null}
      />
    )
  }

  // Show waiting room when player is in a room with waiting status
  if (currentRoom && gameStatus === 'waiting') {
    return (
      <WaitingRoom
        room={currentRoom}
        getConnection={() => getConnection() as DbConnection | null}
        tableTheme={tableTheme}
      />
    )
  }

  // Show game table when game is in bidding, doubling or playing status
  if (currentRoom && (gameStatus === 'bidding' || gameStatus === 'doubling' || gameStatus === 'playing')) {
    return (
      <GameTable
        room={currentRoom}
        getConnection={() => getConnection() as DbConnection | null}
        audio={audio}
        onFirstInteraction={initializeAudio}
        tableTheme={tableTheme}
      />
    )
  }

  // 游戏结束后显示等待室（可以继续下一局）
  if (currentRoom && gameStatus === 'finished') {
    return (
      <WaitingRoom
        room={currentRoom}
        getConnection={() => getConnection() as DbConnection | null}
        tableTheme={tableTheme}
      />
    )
  }

  return (
    <>
      {/* 系统通知弹窗 */}
      {showNotification && latestNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{latestNotification.message}</span>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-2 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <LobbyLayout
        userName={userName}
        onLogout={() => setUserName(null)}
        getConnection={() => getConnection() as DbConnection | null}
      />
    </>
  )
}
