/**
 * Folder colours. Kept as literal class strings (not interpolated) so Tailwind's
 * scanner can see them at build time.
 */
export const FOLDER_COLOR_CLASS: Record<string, { dot: string; chip: string }> = {
  slate: { dot: "bg-slate-500", chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  blue: { dot: "bg-blue-500", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  red: { dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 dark:text-red-300" },
  emerald: { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  rose: { dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  cyan: { dot: "bg-cyan-500", chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
};

export function folderColorClass(color: string | null | undefined) {
  return FOLDER_COLOR_CLASS[color ?? "slate"] ?? FOLDER_COLOR_CLASS.slate;
}
