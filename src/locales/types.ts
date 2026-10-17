/**
 * Structural helper for locale dictionaries. Arabic is authored as a deep
 * partial so a missed key safely falls back to English instead of rendering a
 * raw key string — the app is never half-translated, and shipping a new screen
 * can't break an existing language.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends object ? DeepPartial<T[K]> : T[K];
};
