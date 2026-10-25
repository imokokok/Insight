import {
  createRequestDeadline,
  RequestDeadlineExceededError,
  throwIfAborted,
} from '../requestDeadline';

describe('createRequestDeadline', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts the shared signal at the application deadline', () => {
    jest.useFakeTimers();
    const deadline = createRequestDeadline(undefined, 25, 'oracle deadline exceeded');

    jest.advanceTimersByTime(25);

    expect(deadline.didExpire()).toBe(true);
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.signal.reason).toBeInstanceOf(RequestDeadlineExceededError);
    expect(() => throwIfAborted(deadline.signal)).toThrow('oracle deadline exceeded');
    deadline.dispose();
  });

  it('propagates a client disconnect without misreporting a deadline expiry', () => {
    const client = new AbortController();
    const deadline = createRequestDeadline(client.signal, 1_000);
    const disconnect = new Error('client disconnected');

    client.abort(disconnect);

    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.didExpire()).toBe(false);
    expect(() => throwIfAborted(deadline.signal)).toThrow('client disconnected');
    deadline.dispose();
  });
});
