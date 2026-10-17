import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, parseUtcDate, toIsoDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/** ISO `yyyy-MM-dd` date picker. Values stay calendar-day (never timezone-shifted). */
export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  id,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = parseUtcDate(value ?? null);
  const [month, setMonth] = useState<Date>(() => selected ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, index) =>
      new Intl.DateTimeFormat(language === "ar" ? "ar-EG-u-nu-latn" : "en-US", { weekday: "narrow" }).format(
        new Date(base.getTime() + index * 86_400_000)
      )
    );
  }, [language]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-start text-2sm shadow-xs transition-colors",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
            "disabled:cursor-not-allowed disabled:opacity-60",
            invalid && "border-destructive",
            className
          )}
        >
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate tabular", !selected && "text-muted-foreground/70")}>
            {selected ? formatDate(selected, language === "ar" ? "ar" : "en") : (placeholder ?? t("common.none2"))}
          </span>
          {selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t("common.clear")}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={event => {
                event.stopPropagation();
                onChange(null);
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex items-center justify-between gap-2 pb-2">
          <Button variant="ghost" size="icon-sm" type="button" onClick={() => setMonth(m => addMonths(m, -1))}>
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <span className="text-2sm font-medium">
            {new Intl.DateTimeFormat(language === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
              month: "long",
              year: "numeric",
            }).format(month)}
          </span>
          <Button variant="ghost" size="icon-sm" type="button" onClick={() => setMonth(m => addMonths(m, 1))}>
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="flex size-8 items-center justify-center text-2xs font-medium text-muted-foreground"
            >
              {label}
            </span>
          ))}
          {days.map(day => {
            const isSelected = selected ? isSameDay(day, selected) : false;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onChange(toIsoDate(day));
                  setOpen(false);
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-2sm tabular transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                  !isSameMonth(day, month) && "text-muted-foreground/40",
                  isToday(day) && !isSelected && "font-semibold text-primary",
                  isSelected && "bg-primary font-medium text-primary-foreground hover:bg-primary"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              onChange(toIsoDate(new Date()));
              setOpen(false);
            }}
          >
            {t("common.today")}
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
            {t("common.clear")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
