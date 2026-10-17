/**
 * Structural helper for locale dictionaries. Arabic is authored as a deep
 * partial so a missed key safely falls back to English instead of rendering a
 * raw key string — the app is never half-translated, and shipping a new screen
 * can't break an existing language.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Same as `DeepPartial`, but tolerant of extra keys.
 *
 * Arabic has six CLDR plural categories (zero, one, two, few, many, other)
 * while English only ever resolves two, so the Arabic dictionary necessarily
 * carries plural suffixes with no English counterpart. Without this, those keys
 * can't be declared — and i18next answers a missing category from the *English*
 * resource, silently printing English text inside an Arabic screen.
 *
 * Base keys stay exactly as type-checked as before; a `_few`/`_many` addition is
 * simply allowed. The locale parity check covers typos in the added keys.
 */
export type LooseDeep<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends object ? LooseDeep<T[K]> : T[K];
} & Record<string, unknown>;
