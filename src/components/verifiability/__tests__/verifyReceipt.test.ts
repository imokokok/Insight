import { gateNote, parseReceiptInput, shortAddress, toReceiptVerification } from '../verifyReceipt';

describe('parseReceiptInput', () => {
  it('rejects empty input', () => {
    expect(parseReceiptInput('   ')).toMatchObject({ ok: false });
  });

  it('rejects malformed JSON', () => {
    expect(parseReceiptInput('{nope')).toMatchObject({ ok: false });
  });

  it('rejects non-object JSON', () => {
    expect(parseReceiptInput('"a string"')).toMatchObject({ ok: false });
    expect(parseReceiptInput('[1,2]')).toMatchObject({ ok: false });
  });

  it('accepts a plain object', () => {
    const r = parseReceiptInput('{"schemaVersion":3}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ schemaVersion: 3 });
  });
});

describe('toReceiptVerification', () => {
  it('maps a success envelope', () => {
    const r = toReceiptVerification({
      success: true,
      data: {
        valid: true,
        expired: false,
        attester: '0xabcdef1234567890abcdef1234567890abcdef12',
        uid: 'u-1',
        checkedAt: 1700000000,
        validUntil: 1700000600,
        ageSeconds: null,
        schemaVersion: 3,
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.result.valid).toBe(true);
      expect(r.result.schemaVersion).toBe(3);
      expect(r.result.checkedAt).toBe(1700000000);
    }
  });

  it('surfaces an error envelope', () => {
    const r = toReceiptVerification({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'not a receipt' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('not a receipt');
  });

  it('rejects a response without schemaVersion', () => {
    const r = toReceiptVerification({ success: true, data: { valid: true } });
    expect(r.ok).toBe(false);
  });
});

describe('gateNote', () => {
  it('v3: both gates recomputable', () => {
    expect(gateNote(3)).toContain('recomputable from the bytes');
  });

  it('v1/v2: independence threshold asserted', () => {
    expect(gateNote(1)).toContain('asserted');
    expect(gateNote(2)).toContain('asserted');
  });
});

describe('shortAddress', () => {
  it('truncates long addresses', () => {
    expect(shortAddress('0xabcdef1234567890abcdef1234567890abcdef12')).toBe('0xabcd…ef12');
  });

  it('passes short strings through', () => {
    expect(shortAddress('short')).toBe('short');
    expect(shortAddress(null)).toBeNull();
  });
});
