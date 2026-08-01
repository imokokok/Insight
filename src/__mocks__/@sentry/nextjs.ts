export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const setUser = jest.fn();
export const addBreadcrumb = jest.fn();
export const flush = jest.fn();

export const metrics = {
  distribution: jest.fn(),
  increment: jest.fn(),
  gauge: jest.fn(),
  set: jest.fn(),
};
