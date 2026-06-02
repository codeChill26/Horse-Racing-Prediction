export default function AdminIconButton({
  label,
  onClick,
  disabled,
  variant = 'ghost',
  children,
}) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
      <span className="admin-icon-btn__tooltip">{label}</span>
    </button>
  )
}
