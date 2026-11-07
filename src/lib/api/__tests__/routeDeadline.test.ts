import { ROUTE_DEADLINE_MS, RouteDeadlineExceededError, withRouteDeadline } from '../routeDeadline';

describe('route deadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the handler result when the work settles before the deadline', async () => {
    await expect(withRouteDeadline(Promise.resolve('ok'), 5_000)).resolves.toBe('ok');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects with ROUTE_DEADLINE_EXCEEDED semantics when the deadline expires', async () => {
    const never = new Promise<never>(() => {});
    const pending = withRouteDeadline(never, 5_000);
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'RouteDeadlineExceededError',
      deadlineMs: 5_000,
    });

    await jest.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('gives every invocation its own timer', async () => {
    const first = withRouteDeadline(new Promise<never>(() => {}), 1_000);
    const second = withRouteDeadline(new Promise<never>(() => {}), 2_000);
    const firstAssertion = expect(first).rejects.toBeInstanceOf(RouteDeadlineExceededError);
    const secondAssertion = expect(second).rejects.toBeInstanceOf(RouteDeadlineExceededError);

    await jest.advanceTimersByTimeAsync(1_000);
    await firstAssertion;
    // The second route still has its budget; the first route expiring must not
    // shorten or consume it.
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(1_000);
    await secondAssertion;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses 25 seconds as the production budget', () => {
    expect(ROUTE_DEADLINE_MS).toBe(25_000);
  });
});
