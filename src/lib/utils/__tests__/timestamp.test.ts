import { ValidationError } from '@/lib/errors';

import {
  type TimeAgoResult,
  formatTimeAgoWithColor,
  getTimeAgoDiff,
  toMilliseconds,
} from '../timestamp';

describe('toMilliseconds', () => {
  it('treats numbers below 1e10 as seconds', () => {
    expect(toMilliseconds(1234567890)).toBe(1234567890000);
  });

  it('passes through millisecond-scale numbers unchanged', () => {
    expect(toMilliseconds(1234567890000)).toBe(1234567890000);
  });

  it('converts a Date object', () => {
    const d = new Date('2024-01-01T00:00:00.000Z');
    expect(toMilliseconds(d)).toBe(d.getTime());
  });

  it('parses an ISO string', () => {
    expect(toMilliseconds('2024-01-01T00:00:00Z')).toBe(1704067200000);
  });

  it('throws ValidationError on an invalid date string', () => {
    expect(() => toMilliseconds('not-a-date')).toThrow(ValidationError);
  });

  describe('fail-loud on non-finite numbers', () => {
    it('throws on NaN', () => {
      expect(() => toMilliseconds(Number.NaN)).toThrow(ValidationError);
    });

    it('throws on Infinity', () => {
      expect(() => toMilliseconds(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
    });

    it('throws on -Infinity', () => {
      expect(() => toMilliseconds(Number.NEGATIVE_INFINITY)).toThrow(ValidationError);
    });
  });
});

describe('getTimeAgoDiff', () => {
  it('flags a future timestamp with isFuture', () => {
    const future = Date.now() + 3 * 60 * 60 * 1000; // +3h
    const diff = getTimeAgoDiff(future);
    expect(diff.isFuture).toBe(true);
    expect(diff.unit).toBe('hours');
    expect(diff.value).toBe(3);
  });

  it('flags a past timestamp without isFuture', () => {
    const past = Date.now() - 2 * 24 * 60 * 60 * 1000; // -2d
    const diff = getTimeAgoDiff(past);
    expect(diff.isFuture).toBe(false);
    expect(diff.unit).toBe('days');
    expect(diff.value).toBe(2);
  });

  it('accepts a raw millisecond number', () => {
    const past = Date.now() - 5 * 60 * 1000;
    const diff = getTimeAgoDiff(past);
    expect(diff.isFuture).toBe(false);
    expect(diff.unit).toBe('minutes');
    expect(diff.value).toBe(5);
  });
});

describe('formatTimeAgoWithColor', () => {
  const make = (value: number, unit: TimeAgoResult['unit'], isFuture: boolean): TimeAgoResult => ({
    value,
    unit,
    isFuture,
  });

  it('renders a future timestamp as "In X" (regression for missing isFuture)', () => {
    expect(formatTimeAgoWithColor(make(3, 'hours', true))).toEqual({
      text: 'In 3h',
      color: 'text-gray-500',
    });
    expect(formatTimeAgoWithColor(make(2, 'days', true))?.text).toBe('In 2d');
    expect(formatTimeAgoWithColor(make(45, 'seconds', true))?.text).toBe('In 45s');
  });

  it('keeps past-tense rendering unchanged', () => {
    expect(formatTimeAgoWithColor(make(5, 'minutes', false))).toEqual({
      text: '5m ago',
      color: 'text-emerald-600',
    });
    expect(formatTimeAgoWithColor(make(1, 'days', false))).toEqual({
      text: '1d ago',
      color: 'text-gray-400',
    });
    expect(formatTimeAgoWithColor(make(0, 'seconds', false))).toEqual({
      text: 'just now',
      color: 'text-emerald-600',
    });
  });
});
