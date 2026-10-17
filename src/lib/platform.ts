export const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const MOD_KEY = IS_MAC ? "⌘" : "Ctrl";

/** "⌘K" on macOS, "Ctrl K" elsewhere. */
export function shortcut(...keys: string[]) {
  return [MOD_KEY, ...keys].join(IS_MAC ? "" : " ");
}

/** Formats a sequence such as G then D. */
export function sequence(...keys: string[]) {
  return keys.join(" ");
}
