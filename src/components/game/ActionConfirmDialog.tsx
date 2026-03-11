import { useEffect, useCallback } from 'react'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface ActionConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText?: string
  variant?: 'primary' | 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
  autoCloseMs?: number
}

export function ActionConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = '取消',
  variant = 'primary',
  onConfirm,
  onCancel,
  autoCloseMs,
}: ActionConfirmDialogProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  // 自动关闭
  useEffect(() => {
    if (isOpen && autoCloseMs) {
      const timer = setTimeout(onCancel, autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoCloseMs, onCancel])

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter') {
      onConfirm()
    }
  }, [isOpen, onCancel, onConfirm])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700',
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div 
        className={`bg-gray-800 rounded-xl shadow-2xl border border-gray-700 ${isCompact ? 'mx-3 p-4 max-w-sm' : 'mx-4 p-6 max-w-md'} animate-in fade-in zoom-in duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-white font-bold ${isCompact ? 'text-lg mb-2' : 'text-xl mb-3'}`}>
          {title}
        </h3>
        <p className={`text-gray-300 ${isCompact ? 'text-sm mb-4' : 'text-base mb-5'}`}>
          {message}
        </p>
        <div className={`flex ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <button
            onClick={onCancel}
            className={`flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors ${isCompact ? 'py-2 text-sm' : 'py-2.5 text-base'}`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white font-medium rounded-lg transition-colors ${isCompact ? 'py-2 text-sm' : 'py-2.5 text-base'} ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
