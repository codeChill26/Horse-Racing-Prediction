/**
 * Reusable Badge/StatusBadge component
 */

const variantStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  live: 'bg-red-100 text-red-700 border-red-200 animate-pulse',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  finished: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function Badge({ children, variant = 'info', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant] || variantStyles.info} ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, statusText }) {
  let variant = 'info'
  const s = String(status || '').toLowerCase()
  if (s === 'live' || s === 'won' || s === 'win' || s === 'thắng') variant = 'live'
  else if (s === 'upcoming' || s === 'sắp diễn ra') variant = 'upcoming'
  else if (s === 'finished' || s === 'đã kết thúc' || s === 'lost') variant = 'finished'
  else if (s === 'won' || s === 'đã thắng') variant = 'success'
  else if (s === 'lost' || s === 'đã thua') variant = 'danger'
  else if (s === 'pending' || s === 'chờ duyệt') variant = 'warning'
  else if (s === 'cancelled' || s === 'đã hủy') variant = 'neutral'

  return <Badge variant={variant}>{statusText || status}</Badge>
}
