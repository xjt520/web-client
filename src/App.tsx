import { useSpacetimeDB } from 'spacetimedb/react'
import { useEffect } from 'react'
import { ConnectionStatus } from './components/auth/ConnectionStatus'
import { LoginScreen } from './components/auth/LoginScreen'
import { LobbyLayout } from './components/lobby/LobbyLayout'
import { WaitingRoom } from './components/lobby/WaitingRoom'
import { GameTable } from './components/game/GameTable'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useGame } from './hooks/useGame'
import type { DbConnection } from './lib/spacetime'
import type { User } from './module_bindings/types'

// 获取环境变量
const STDB_URI = import.meta.env.VITE_STDB_URI || 'ws://localhost:3000'
const STDB_MODULE = import.meta.env.VITE_STDB_MODULE || 'doudizhu-game'

export default function App() {
  const { isActive, connectionError, getConnection } = useSpacetimeDB()
  const [userName, setUserName] = useLocalStorage<string | null>('doudizhu_username', null)
  const { currentRoom, gameStatus } = useGame(getConnection as () => DbConnection | null)

  // 页面加载时打印数据库连接信息
  useEffect(() => {
    console.log('========================================')
    console.log('SpacetimeDB 连接信息:')
    console.log('  数据库地址:', STDB_URI)
    console.log('  数据库名称:', STDB_MODULE)
    console.log('========================================')
  }, [])

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
      console.log('User not found in database, re-registering...')
      try {
        conn.reducers.join({ name: userName })
      } catch (err) {
        console.error('Failed to re-register user:', err)
        // 如果注册失败，清除本地存储的用户名
        setUserName(null)
      }
    }
  }, [isActive, userName, getConnection, setUserName])

  if (!isActive) {
    return <ConnectionStatus error={connectionError?.message ?? null} />
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
      />
    )
  }

  // Show game table when game is in bidding, doubling or playing status
  if (currentRoom && (gameStatus === 'bidding' || gameStatus === 'doubling' || gameStatus === 'playing')) {
    return (
      <GameTable
        room={currentRoom}
        getConnection={() => getConnection() as DbConnection | null}
      />
    )
  }

  // Show waiting room when game is finished (player stays in room)
  if (currentRoom && gameStatus === 'finished') {
    return (
      <WaitingRoom
        room={currentRoom}
        getConnection={() => getConnection() as DbConnection | null}
      />
    )
  }

  return (
    <LobbyLayout
      userName={userName}
      onLogout={() => setUserName(null)}
      getConnection={() => getConnection() as DbConnection | null}
    />
  )
}
