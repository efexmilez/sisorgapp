interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: 'bg-green-100', text: 'text-green-800', label: 'Verified' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    disbursed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disbursed' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
    awaiting_transfer: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Processing' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    repaid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Repaid' },
  }

  const config = statusConfig[status.toLowerCase()] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    label: status,
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full uppercase tracking-wider ${config.bg} ${config.text} ${sizeClasses}`}
    >
      <span className="material-symbols-outlined text-sm">
        {status.toLowerCase() === 'success' || status.toLowerCase() === 'approved' || status.toLowerCase() === 'disbursed'
          ? 'check_circle'
          : status.toLowerCase() === 'rejected' || status.toLowerCase() === 'failed'
          ? 'error'
          : 'schedule'}
      </span>
      {config.label}
    </span>
  )
}
