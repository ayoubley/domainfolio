import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGISTRARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** The "Other" choice. A sentinel for the picker only — never stored. */
const OTHER = "__other__";
const KNOWN: readonly string[] = REGISTRARS;

/**
 * Registrar picker: the platforms in `REGISTRARS`, plus "Other", which reveals a
 * free-text field for a custom registrar name.
 *
 * A stored registrar that isn't on the list (an import, or a name typed before
 * this picker existed) opens straight into the free-text field, so the value is
 * shown as-is instead of being dropped or guessed at.
 */
export function RegistrarSelect({
  id,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const isCustom = (input: string) => input !== "" && !KNOWN.includes(input);

  const [mode, setMode] = useState<"list" | "other">(() => (isCustom(value) ? "other" : "list"));
  const [custom, setCustom] = useState(() => (isCustom(value) ? value : ""));
  const seen = useRef(value);

  // Follow the field when the form loads another record or resets — but never
  // fight the user while they are typing the custom name.
  if (value !== seen.current) {
    const typingCustom = mode === "other" && value === "";
    seen.current = value;
    if (!typingCustom) {
      setMode(isCustom(value) ? "other" : "list");
      setCustom(isCustom(value) ? value : "");
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={mode === "other" ? OTHER : value}
        onValueChange={next => {
          if (next === OTHER) {
            setMode("other");
            setCustom("");
            onChange("");
            return;
          }
          setMode("list");
          setCustom("");
          onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(invalid && "border-destructive focus:ring-destructive/25")}
        >
          <SelectValue placeholder={t("domains.form.registrarPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {REGISTRARS.map(registrar => (
            <SelectItem key={registrar} value={registrar}>
              {registrar}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>{t("domains.form.registrarOther")}</SelectItem>
        </SelectContent>
      </Select>

      {mode === "other" ? (
        <Input
          id={`${id}-other`}
          autoComplete="off"
          spellCheck={false}
          aria-label={t("domains.form.registrar")}
          placeholder={t("domains.form.registrarOtherPlaceholder")}
          value={custom}
          onChange={event => {
            setCustom(event.target.value);
            onChange(event.target.value);
          }}
        />
      ) : null}
    </div>
  );
}
