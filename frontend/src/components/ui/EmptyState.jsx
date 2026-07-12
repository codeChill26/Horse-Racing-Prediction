/**
 * EmptyState component for no data scenarios
 */

export function EmptyState({ title = 'Không có dữ liệu', description = 'Hiện chưa có thông tin để hiển thị.', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon ? (
        <Icon className="w-16 h-16 text-gray-300 mb-4" />
      ) : (
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
    </div>
  )
}
