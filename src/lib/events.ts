/**
 * Tiny typed event bus over `window` for cross-component commands (topbar,
 * command palette) that need to reach a page without prop-drilling.
 */
export const APP_EVENTS = {
  focusSearch: "domainfolio:focus-search",
  exportView: "domainfolio:export-view",
} as const;

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

export function emit(name: AppEventName, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onAppEvent(name: AppEventName, handler: () => void) {
  const listener = () => handler();
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}
