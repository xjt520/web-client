import type { ToastMessage } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: number) => void
}

const iconMap = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const styleMap = {
  success: {
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    border: 'border-emerald-400',
    shadow: 'shadow-emerald-500/30',
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500 to-rose-500',
    border: 'border-red-400',
    shadow: 'shadow-red-500/30',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    border: 'border-amber-400',
    shadow: 'shadow-amber-500/30',
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    border: 'border-blue-400',
    shadow: 'shadow-blue-500/30',
  },
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = styleMap[toast.type]
        const icon = iconMap[toast.type]

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 px-4 py-3 rounded-xl
              ${style.bg} ${style.border} border
              shadow-lg ${style.shadow}
              text-white font-medium
              animate-toast-in
              min-w-[280px] max-w-[400px]
              backdrop-blur-sm
            `}
            onClick={() => onRemove(toast.id)}
          >
            <span className="flex-shrink-0 opacity-90">{icon}</span>
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(toast.id)
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
