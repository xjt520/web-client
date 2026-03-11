import { useState, useEffect } from 'react'

interface ConnectionStatusProps {
  error: string | null
  onRetry?: () => void
}

export function ConnectionStatus({ error, onRetry }: ConnectionStatusProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // 自动重连逻辑
  useEffect(() => {
    if (error && retryCount < 3) {
      setIsRetrying(true)
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        onRetry?.()
      }, 2000 * (retryCount + 1)) // 递增延迟
      
      return () => clearTimeout(timer)
    } else {
      setIsRetrying(false)
    }
  }, [error, retryCount, onRetry])

  const handleManualRetry = () => {
    setRetryCount(0)
    window.location.reload()
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center px-4">
          <div className="text-6xl mb-4 animate-bounce">⚠️</div>
          <h1 className="text-2xl text-white mb-2 font-bold">连接失败</h1>
          <p className="text-gray-400 mb-4 max-w-md">{error}</p>
          
          {isRetrying && (
            <div className="mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-blue-400 text-sm">
                正在尝试重新连接... ({retryCount + 1}/3)
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleManualRetry}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              手动重试
            </button>
            {retryCount >= 3 && (
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                清除缓存
              </button>
            )}
          </div>
          
          <div className="mt-6 text-gray-500 text-sm">
            <p>请检查：</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• 网络连接是否正常</li>
              <li>• SpacetimeDB 服务是否运行</li>
              <li>• 防火墙是否阻止了连接</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500"></div>
          <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/20"></div>
        </div>
        <p className="text-white font-medium mb-1">正在连接服务器</p>
        <p className="text-gray-400 text-sm">请稍候...</p>
        
        {/* 连接进度提示 */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-200"></div>
        </div>
      </div>
    </div>
  )
}
