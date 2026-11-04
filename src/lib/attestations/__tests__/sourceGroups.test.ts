import { nonDerivedGroupCount, resolveSourceGroup } from '../sourceGroups';

describe('source-group classification', () => {
  it('classifies Pyth and Stork as reviewed operator groups', () => {
    expect(resolveSourceGroup('pyth')).toBe('pyth');
    expect(resolveSourceGroup('stork')).toBe('stork');
    expect(nonDerivedGroupCount(['pyth', 'stork'])).toBe(2);
  });
});
