interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 确认对话框组件 - 友好的卡片提示
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: '⚠️',
      iconBg: 'bg-red-500/20',
      confirmBtn: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: '⚠️',
      iconBg: 'bg-yellow-500/20',
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-500/20',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700',
    },
  }

  const style = variantStyles[variant]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl transform transition-all">
        {/* 图标 */}
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${style.iconBg} flex items-center justify-center`}>
          <span className="text-3xl">{style.icon}</span>
        </div>

        {/* 标题 */}
        <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>

        {/* 消息 */}
        <p className="text-gray-400 text-center mb-6 text-sm leading-relaxed">{message}</p>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 ${style.confirmBtn} text-white font-medium rounded-lg transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
