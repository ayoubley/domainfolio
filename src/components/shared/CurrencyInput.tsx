import { forwardRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { moneyNumber } from "@/lib/domain-rules";
import { Input } from "@/components/ui/input";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
  currency?: string | null;
  invalid?: boolean;
};

/**
 * Numeric money field. Keeps its own raw text so a user can type "1." or "" and
 * never fights the parser; the numeric value is what escapes to the form.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, currency, className, invalid, ...props }, ref) => {
    const [text, setText] = useState(() => (value === null ? "" : String(value)));

    function handleChange(next: string) {
      setText(next);
      onValueChange(moneyNumber(next));
    }

    return (
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-2sm text-muted-foreground"
        >
          {currencySymbol(currency)}
        </span>
        <Input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={event => handleChange(event.target.value)}
          onBlur={() => setText(value === null ? "" : String(value))}
          invalid={invalid}
          className={cn("ps-7 tabular", className)}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
