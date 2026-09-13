import { SafeBooleanQuerySchema } from './validation';

describe('SafeBooleanQuerySchema', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    [true, true],
    [false, false],
  ])('parses %p as %p', (input, expected) => {
    expect(SafeBooleanQuerySchema.parse(input)).toBe(expected);
  });

  it('rejects ambiguous truthy strings', () => {
    expect(SafeBooleanQuerySchema.safeParse('yes').success).toBe(false);
  });
});
