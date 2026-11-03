import {
  buildValidationResponseHash,
  selectPendingValidations,
  validationRegistryAddress,
  VALIDATION_REGISTRY_ENV_KEY,
  VALIDATION_RESPONSE_COMPLETED,
  VALIDATION_RESPONSE_URI,
  VALIDATION_TAG,
} from '../validationRegistry';

const REQUEST_A = `0x${'a'.repeat(64)}` as `0x${string}`;
const REQUEST_B = `0x${'b'.repeat(64)}` as `0x${string}`;

describe('validationRegistry constants', () => {
  it('mirrors the reputation write semantics (score never judges the trade)', () => {
    expect(VALIDATION_RESPONSE_COMPLETED).toBe(100);
    expect(VALIDATION_TAG).toBe('oracle-safety-check');
    expect(VALIDATION_RESPONSE_URI).toBe(
      'https://www.oracleinsight.xyz/erc8004/v1/insight-evidence.v1.json'
    );
  });
});

describe('buildValidationResponseHash', () => {
  it('hashes the evidence content deterministically', () => {
    const evidence = '{"type":"insight-evidence-v1"}';
    expect(buildValidationResponseHash(evidence)).toBe(buildValidationResponseHash(evidence));
  });

  it('binds to the exact content — a changed spec yields a different hash', () => {
    expect(buildValidationResponseHash('a')).not.toBe(buildValidationResponseHash('b'));
  });
});

describe('validationRegistryAddress', () => {
  it('returns null when unset or blank (responder stays disabled)', () => {
    expect(validationRegistryAddress({})).toBeNull();
    expect(validationRegistryAddress({ [VALIDATION_REGISTRY_ENV_KEY]: '  ' })).toBeNull();
  });

  it('returns null for malformed addresses', () => {
    expect(validationRegistryAddress({ [VALIDATION_REGISTRY_ENV_KEY]: '0x1234' })).toBeNull();
    expect(
      validationRegistryAddress({
        [VALIDATION_REGISTRY_ENV_KEY]: 'not-an-address',
      })
    ).toBeNull();
  });

  it('accepts a well-formed address, normalized to lowercase', () => {
    expect(
      validationRegistryAddress({
        [VALIDATION_REGISTRY_ENV_KEY]: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      })
    ).toBe('0x8004a169fb4a3325136eb29fa0ceb6d2e539a432');
  });
});

describe('selectPendingValidations', () => {
  it('returns only unanswered requests and counts the rest', () => {
    const selection = selectPendingValidations([
      { requestHash: REQUEST_A, response: 0 },
      { requestHash: REQUEST_B, response: 100 },
    ]);
    expect(selection.pending).toEqual([REQUEST_A]);
    expect(selection.alreadyAnswered).toBe(1);
    expect(selection.unreadable).toBe(0);
  });

  it('treats any non-zero on-chain score as answered', () => {
    const selection = selectPendingValidations([{ requestHash: REQUEST_A, response: 42 }]);
    expect(selection.pending).toEqual([]);
    expect(selection.alreadyAnswered).toBe(1);
  });

  it('counts unreadable requests for retry without answering them', () => {
    const selection = selectPendingValidations([
      { requestHash: REQUEST_A, response: 0, readError: 'reverted: unknown' },
    ]);
    expect(selection.pending).toEqual([]);
    expect(selection.unreadable).toBe(1);
    expect(selection.alreadyAnswered).toBe(0);
  });

  it('handles an empty validator request list', () => {
    expect(selectPendingValidations([])).toEqual({
      pending: [],
      alreadyAnswered: 0,
      unreadable: 0,
    });
  });
});
