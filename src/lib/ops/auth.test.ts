import { isOpsOwner } from './auth';

describe('isOpsOwner (OPS_OWNER_USER_IDS allowlist)', () => {
  const ORIGINAL = process.env.OPS_OWNER_USER_IDS;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.OPS_OWNER_USER_IDS;
    else process.env.OPS_OWNER_USER_IDS = ORIGINAL;
  });

  it('allows any user when the allowlist is unset (dev convenience)', () => {
    delete process.env.OPS_OWNER_USER_IDS;
    expect(isOpsOwner('anyone')).toBe(true);
    expect(isOpsOwner(undefined)).toBe(true);
    expect(isOpsOwner(null)).toBe(true);
  });

  it('denies when the allowlist is unset in production (fail-closed)', () => {
    const prevEnv = process.env.NODE_ENV;
    delete process.env.OPS_OWNER_USER_IDS;
    process.env.NODE_ENV = 'production';
    try {
      expect(isOpsOwner('anyone')).toBe(false);
      expect(isOpsOwner(undefined)).toBe(false);
      expect(isOpsOwner(null)).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('blocks when the allowlist is set but no user id is given', () => {
    process.env.OPS_OWNER_USER_IDS = 'uuid-a';
    expect(isOpsOwner(undefined)).toBe(false);
    expect(isOpsOwner(null)).toBe(false);
    expect(isOpsOwner('')).toBe(false);
  });

  it('matches the exact uuid, tolerating whitespace and extra commas', () => {
    process.env.OPS_OWNER_USER_IDS = ' uuid-a, uuid-b ,uuid-c,';
    expect(isOpsOwner('uuid-b')).toBe(true);
    expect(isOpsOwner('uuid-a')).toBe(true);
    expect(isOpsOwner('uuid-c')).toBe(true);
    expect(isOpsOwner('uuid-x')).toBe(false);
  });
});
