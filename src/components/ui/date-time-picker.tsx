import { useMemo, useState, useRef, useEffect } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateTimePickerProps {
  value: Date
  onChange: (date: Date) => void
  placeholder?: string
  className?: string
}

// Calendar + 3-column time picker (hour / minute / AM-PM), modeled on the
// shadcn datetime block. Time columns auto-scroll the active value into view.
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: Readonly<DateTimePickerProps>) {
  const [open, setOpen] = useState(false)

  const hours12 = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])

  const hour24 = value.getHours()
  const minute = value.getMinutes()
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  const handleDateSelect = (next: Date | undefined) => {
    if (!next) return
    const merged = new Date(next)
    merged.setHours(hour24, minute, 0, 0)
    onChange(merged)
  }

  const setHour12 = (h: number) => {
    const next = new Date(value)
    const newHour24 = period === "AM" ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12
    next.setHours(newHour24, minute, 0, 0)
    onChange(next)
  }

  const setMinute = (m: number) => {
    const next = new Date(value)
    next.setMinutes(m, 0, 0)
    onChange(next)
  }

  const setPeriod = (p: "AM" | "PM") => {
    if (p === period) return
    const next = new Date(value)
    next.setHours(p === "AM" ? hour24 - 12 : hour24 + 12, minute, 0, 0)
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-8 text-xs px-2",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          {value ? format(value, "MMM d, p") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            initialFocus
            fixedWeeks
          />
          {/* h-[324px] matches a fixedWeeks calendar (p-3 + caption + 6 weeks).
              Hardcoded because flex stretch can't anchor against content that
              overflows — without an explicit anchor the columns blow out the
              popover to their natural ~2160px height. */}
          <div className="flex border-l border-border h-[324px] p-3 gap-1">
            <TimeColumn
              values={hours12}
              selected={hour12}
              onSelect={setHour12}
              format={(n) => n.toString().padStart(2, "0")}
            />
            <TimeColumn
              values={minutes}
              selected={minute}
              onSelect={setMinute}
              format={(n) => n.toString().padStart(2, "0")}
            />
            <TimeColumn
              values={["AM", "PM"]}
              selected={period}
              onSelect={(p) => setPeriod(p as "AM" | "PM")}
              format={(s) => String(s)}
              centerVertically
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface TimeColumnProps<T extends string | number> {
  values: readonly T[]
  selected: T
  onSelect: (value: T) => void
  format: (value: T) => string
  centerVertically?: boolean
}

function TimeColumn<T extends string | number>({
  values,
  selected,
  onSelect,
  format: formatFn,
  centerVertically = false,
}: Readonly<TimeColumnProps<T>>) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)

  // Scroll the active value into view whenever it changes. Skipped for
  // centered (short) columns so we don't fight the parent's centering.
  useEffect(() => {
    if (centerVertically) return
    activeRef.current?.scrollIntoView({ block: "nearest" })
  }, [selected, centerVertically])

  return (
    <div
      ref={scrollRef}
      className={cn(
        "w-12 h-full overflow-y-auto px-1",
        // Hide native scrollbar — wheel/touch still scrolls. Keeps columns
        // visually balanced so AM/PM doesn't get pushed far right.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        centerVertically && "flex items-center",
      )}
    >
      <div className="flex flex-col gap-1 w-full">
        {values.map((v) => {
          const isActive = v === selected
          return (
            <button
              key={String(v)}
              ref={isActive ? activeRef : null}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                "h-8 w-full rounded-sm text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground",
              )}
            >
              {formatFn(v)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
