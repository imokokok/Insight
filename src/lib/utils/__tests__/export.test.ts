import { escapeCSVField } from '../export';

describe('escapeCSVField', () => {
  it('prefixes a single quote to formula-injection leading characters', () => {
    expect(escapeCSVField('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCSVField('+1')).toBe("'+1");
    expect(escapeCSVField('-1')).toBe("'-1");
    expect(escapeCSVField('@evil')).toBe("'@evil");
    expect(escapeCSVField('\tfoo')).toBe("'\tfoo");
    expect(escapeCSVField('\rfoo')).toBe("'\rfoo");
  });

  it('quotes fields containing separators and escapes embedded quotes', () => {
    expect(escapeCSVField('foo,bar')).toBe('"foo,bar"');
    expect(escapeCSVField('foo"bar')).toBe('"foo""bar"');
    expect(escapeCSVField('foo\nbar')).toBe('"foo\nbar"');
  });

  it('leaves plain fields untouched', () => {
    expect(escapeCSVField('plain')).toBe('plain');
    expect(escapeCSVField('123')).toBe('123');
  });

  it('returns an empty string for non-string input instead of throwing', () => {
    expect(escapeCSVField(123 as unknown as string)).toBe('');
    expect(escapeCSVField(null as unknown as string)).toBe('');
    expect(escapeCSVField(undefined as unknown as string)).toBe('');
  });
});
