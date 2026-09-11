export const NAVIGATION_START_EVENT = 'insight:navigation-start';

/** Notify the global navigation indicator before a programmatic route change. */
export function announceNavigationStart(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
  }
}
