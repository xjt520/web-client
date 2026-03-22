import { DbConnection } from '../module_bindings'

/**
 * SpacetimeDB 连接配置
 *
 * 本地开发 (默认):
 *   VITE_STDB_URI=ws://localhost:3000
 *   VITE_STDB_MODULE=doudizhu-game
 *
 * 云数据库:
 *   VITE_STDB_URI=wss://maincloud.spacetimedb.io
 *   VITE_STDB_MODULE=your-database-name
 *
 * 配置方式:
 *   1. 复制 web-client/.env.example 为 web-client/.env
 *   2. 修改 .env 中的配置
 *   3. 重启开发服务器
 */
export const STDB_URI = import.meta.env.VITE_STDB_URI || 'ws://localhost:3000'
export const STDB_MODULE = import.meta.env.VITE_STDB_MODULE || 'doudizhu-game'

export const TOKEN_KEY = `${STDB_URI}/${STDB_MODULE}/auth_token`
export const USERNAME_KEY = 'doudizhu_username'

export type { DbConnection } from '../module_bindings'

export function createConnectionBuilder() {
  const token = localStorage.getItem(TOKEN_KEY) || undefined

  return DbConnection.builder()
    .withUri(STDB_URI)
    .withDatabaseName(STDB_MODULE)
    .withToken(token)
    .onConnect((conn, identity, token) => {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      }
      console.log('Connected to SpacetimeDB:', identity.toHexString())

      conn.subscriptionBuilder()
        .onApplied(() => {
          console.log('Subscription applied')
        })
        .subscribe([
          'SELECT * FROM user',
          'SELECT * FROM room',
          'SELECT * FROM room_player',
          'SELECT * FROM game',
          'SELECT * FROM player_hand',
          'SELECT * FROM landlord_cards',
          'SELECT * FROM bid',
          'SELECT * FROM play',
          'SELECT * FROM current_play',
          'SELECT * FROM chat_message',
        ])
    })
    .onDisconnect(() => {
      console.log('Disconnected from SpacetimeDB')
    })
    .onConnectError((_conn, error) => {
      console.error('Connection error:', error)
    })
}
