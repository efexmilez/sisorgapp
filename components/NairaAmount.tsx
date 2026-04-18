import { formatNaira } from '@/lib/formatters'

interface NairaAmountProps {
  kobo: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'default' | 'green' | 'red' | 'muted'
}

export function NairaAmount({ kobo, size = 'md', color = 'default' }: NairaAmountProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }

  const colorClasses = {
    default: 'text-on-surface',
    green: 'text-green-600',
    red: 'text-red-600',
    muted: 'text-on-surface-variant',
  }

  return (
    <span className={`font-bold ${sizeClasses[size]} ${colorClasses[color]}`}>
      {formatNaira(kobo)}
    </span>
  )
}
