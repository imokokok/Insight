/**
 * Tests for downloadBlob.
 *
 * The key invariant under test: URL.revokeObjectURL must be deferred until after
 * the browser has had a chance to read the blob. A synchronous revoke frees the
 * object URL before the asynchronous download reads it, which is a silent download
 * failure (notably for large blobs or non-Chromium browsers).
 */

import { downloadBlob } from '../download';

// jsdom does not implement blob-URL navigation; stub createObjectURL/revokeObjectURL
// and neutralize anchor.click so the test exercises our logic, not jsdom internals.
// (resetMocks:true clears the implementation between tests, so the return value is
// re-established in beforeEach.)
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: mockCreateObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: mockRevokeObjectURL,
  });
});

beforeEach(() => {
  jest.useFakeTimers();
  mockCreateObjectURL.mockReturnValue('blob:mock-url');
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('downloadBlob', () => {
  it('creates an object URL, appends a hidden anchor with the filename, and clicks it', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const appendSpy = jest.spyOn(document.body, 'appendChild');

    downloadBlob(blob, 'report.csv');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe('blob:mock-url');
    expect(anchor.getAttribute('download')).toBe('report.csv');
    expect(anchor.style.visibility).toBe('hidden');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    // The anchor must be detached again after the click.
    expect(document.body.contains(anchor)).toBe(false);
  });

  it('does NOT revoke the object URL synchronously (defers to a macrotask)', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });

    downloadBlob(blob, 'report.csv');

    // Synchronously revoking would free the blob before the browser reads it.
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('still detaches the anchor and defers revocation when the click throws', () => {
    // A thrown click error must propagate, but the finally block must still clean up
    // (detach the anchor) and schedule deferred revocation rather than leaving the
    // object URL leaking.
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click blocked');
    });

    expect(() => downloadBlob(new Blob(['x']), 'r.csv')).toThrow('click blocked');

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
