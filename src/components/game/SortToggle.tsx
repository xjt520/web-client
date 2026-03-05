interface SortToggleProps {
  order: 'asc' | 'desc'
  onChange: (order: 'asc' | 'desc') => void
}

export function SortToggle({ order, onChange }: SortToggleProps) {
  return (
    <button
      onClick={() => onChange(order === 'asc' ? 'desc' : 'asc')}
      className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 rounded-lg text-sm transition-colors"
      title={order === 'asc' ? '从小到大排序' : '从大到小排序'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {order === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m4 0l4-4m0 0l4 4m-4-4v12" />
        )}
      </svg>
      <span>{order === 'asc' ? '升序' : '降序'}</span>
    </button>
  )
}
