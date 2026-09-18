import { Input } from './Input'

export function DatePicker({
  label,
  value,
  onChange,
  error,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <Input
      type="date"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
    />
  )
}
