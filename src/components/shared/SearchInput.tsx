import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import type { InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchInputProps = Omit<InputProps, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
};

/** Search field with a leading icon and a clear button that appears on input. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, onClear, className, ...props }, ref) => (
    <div className="relative">
      <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={event => onValueChange(event.target.value)}
        className={cn("ps-9 pe-8", className)}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => {
            onValueChange("");
            onClear?.();
          }}
          className="absolute inset-y-0 end-2.5 my-auto flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
);
SearchInput.displayName = "SearchInput";
