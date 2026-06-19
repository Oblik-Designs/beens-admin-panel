import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

type MultiFilterGroupProps<T extends string> = {
  label: string
  options: Array<{ value: T; label: string }>
  selected: Array<T>
  onChange: (values: Array<T>) => void
}

export function MultiFilterGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: MultiFilterGroupProps<T>) {
  const toggle = (value: T) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(next)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium text-muted-foreground">
          {label}
        </Label>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1 rounded-md border bg-muted/30 p-2">
        {options.map((option) => {
          const checked = selected.includes(option.value)
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-muted/60"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(option.value)}
              />
              <span className="text-xs">{option.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
