interface Props {
  status: string;
}

const STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  success: 'bg-green-100 text-green-700',
  disbursed: 'bg-blue-100 text-blue-700',
  awaiting_transfer: 'bg-cyan-100 text-cyan-700',
  active: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  defaulted: 'bg-orange-100 text-orange-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ status }: Props) {
  const cls = STYLES[status] ?? 'bg-surface-container-high text-on-surface-variant';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
