/**
 * Unit tests for parseRequestedSchemaVersion (the ?schemaVersion= override).
 *
 * VERITAS round 3 F14: the route used to coerce the raw query through
 * `Number(get(...) ?? '')`, and Number('') is 0 — so the plain /sample call
 * (no query present) reached the signer as schemaVersion 0, i.e. it travelled
 * the unknown-version fallback branch instead of the no-override branch. If
 * that fallback is ever tightened to reject unknown versions, the default
 * sample breaks. These tests pin that "no version asked" is distinguishable
 * from "version 0" at the parse step.
 */

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

describe('parseRequestedSchemaVersion (F14)', () => {
  it('returns undefined when no query parameter is present (never 0)', async () => {
    const { parseRequestedSchemaVersion } = await import('../route');
    // Old behaviour: null ?? '' -> Number('') -> 0 -> Number.isInteger(0) true.
    expect(parseRequestedSchemaVersion(null)).toBeUndefined();
  });

  it('returns undefined for a blank or whitespace-only parameter', async () => {
    const { parseRequestedSchemaVersion } = await import('../route');
    expect(parseRequestedSchemaVersion('')).toBeUndefined();
    expect(parseRequestedSchemaVersion('   ')).toBeUndefined();
  });

  it('parses explicit published layout versions', async () => {
    const { parseRequestedSchemaVersion } = await import('../route');
    expect(parseRequestedSchemaVersion('1')).toBe(1);
    expect(parseRequestedSchemaVersion('2')).toBe(2);
    expect(parseRequestedSchemaVersion('3')).toBe(3);
    expect(parseRequestedSchemaVersion('4')).toBe(4);
    // Whitespace around an explicit version is tolerated (Number semantics).
    expect(parseRequestedSchemaVersion(' 4 ')).toBe(4);
  });

  it('returns undefined for non-integer junk', async () => {
    const { parseRequestedSchemaVersion } = await import('../route');
    expect(parseRequestedSchemaVersion('abc')).toBeUndefined();
    expect(parseRequestedSchemaVersion('12abc')).toBeUndefined();
    expect(parseRequestedSchemaVersion('4.5')).toBeUndefined();
    expect(parseRequestedSchemaVersion('0x4')).toBe(4); // parity with Number()
  });

  it('passes unknown integers through — the fallback is downstream', async () => {
    const { parseRequestedSchemaVersion } = await import('../route');
    // buildExecutionMessage falls back to the current layout for a version it
    // does not know; the parser must not silently rewrite 99 into something else.
    expect(parseRequestedSchemaVersion('99')).toBe(99);
  });
});
