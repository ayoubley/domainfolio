import { cn } from "@/lib/utils";

/** The DomainFolio mark: a stacked "portfolio" glyph in the brand indigo. */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" width={size * 0.6} height={size * 0.6}>
        <path
          d="M12 3.2 4.5 7v10l7.5 3.8L19.5 17V7L12 3.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M12 12.2 4.7 8.4M12 12.2l7.3-3.8M12 12.2V20.6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function LogoWordmark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="text-sm font-semibold tracking-tight text-foreground">DomainFolio</span>
    </span>
  );
}
