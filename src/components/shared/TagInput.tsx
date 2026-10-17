import { X } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Free-form chip input for tags and listing platforms. */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  invalid,
  suggestions = [],
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const next = raw.trim();
    if (!next) return;
    if (!value.some(item => item.toLowerCase() === next.toLowerCase())) {
      onChange([...value, next]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const available = suggestions.filter(
    item => !value.some(existing => existing.toLowerCase() === item.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter(entry => entry !== item))}
                className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        value={draft}
        invalid={invalid}
        placeholder={placeholder}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
      />
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {available.slice(0, 6).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => commit(item)}
              className={cn(
                "rounded-full border border-dashed border-border-strong px-2 py-0.5 text-2xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              )}
            >
              + {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
