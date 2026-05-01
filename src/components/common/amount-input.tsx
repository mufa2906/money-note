"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const ID_FORMATTER = new Intl.NumberFormat("id-ID")

function formatGrouped(value: string): string {
  if (!value) return ""
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return ""
  return ID_FORMATTER.format(Number(digits))
}

function toDigits(value: string): string {
  return value.replace(/[^\d]/g, "")
}

interface AmountInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string
  onChange: (rawNumeric: string) => void
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, className, ...rest }, ref) => {
    const display = formatGrouped(value)

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          ref={ref}
          {...rest}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => onChange(toDigits(e.target.value))}
          className={cn("pl-9 font-mono tabular-nums", className)}
        />
      </div>
    )
  },
)
AmountInput.displayName = "AmountInput"
