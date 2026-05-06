const Sentry = {
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setTag: () => {},
  setContext: () => {},
  addBreadcrumb: () => {},
  init: () => {},
  replayIntegration: () => ({}),
};

export default Sentry;
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const setTag = Sentry.setTag;
export const setContext = Sentry.setContext;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const init = Sentry.init;
export const replayIntegration = Sentry.replayIntegration;
export type ErrorEvent = Record<string, unknown>;
