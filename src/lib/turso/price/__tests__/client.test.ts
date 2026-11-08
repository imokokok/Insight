import {
  readTursoPricePayloadCompactionPolicy,
  readTursoPriceRecordsFallbackOnMiss,
  readTursoPriceRecordsMode,
} from '../client';
import { readTursoPriceProjectionMaxLagSeconds } from '../projectionConfig';

describe('Turso price client configuration', () => {
  it('uses the documented projection-lag default', () => {
    expect(readTursoPriceProjectionMaxLagSeconds({})).toBe(1_800);
  });

  it('accepts a bounded explicit projection-lag SLO', () => {
    expect(
      readTursoPriceProjectionMaxLagSeconds({ TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS: '90' })
    ).toBe(90);
  });

  it.each(['0', '-1', '1.5', '86401', 'not-a-number'])('rejects invalid SLO %s', (value) => {
    expect(() =>
      readTursoPriceProjectionMaxLagSeconds({ TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS: value })
    ).toThrow('Invalid TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS');
  });

  it('defaults price_records to Supabase and keeps the legacy read path', () => {
    expect(readTursoPriceRecordsMode(undefined)).toBe('supabase');
    expect(readTursoPriceRecordsMode('')).toBe('supabase');
    expect(readTursoPriceRecordsFallbackOnMiss(undefined)).toBe(true);
  });

  it('accepts the shadow and turso modes', () => {
    expect(readTursoPriceRecordsMode('shadow')).toBe('shadow');
    expect(readTursoPriceRecordsMode('turso')).toBe('turso');
    expect(readTursoPriceRecordsFallbackOnMiss('false')).toBe(false);
  });

  it.each(['shadow ', 'primary', 'off'])('rejects invalid price_records mode %s', (value) => {
    expect(() => readTursoPriceRecordsMode(value)).toThrow(
      'TURSO_PRICE_RECORDS_MODE must be supabase, shadow, or turso'
    );
  });

  it('keeps the ACKed payload compaction window at the raw retention default', () => {
    expect(readTursoPricePayloadCompactionPolicy({})).toEqual({
      ackedPayloadRetentionDays: 30,
    });
  });

  it('accepts a shorter ACKed payload window', () => {
    expect(
      readTursoPricePayloadCompactionPolicy({
        TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS: '7',
      })
    ).toEqual({ ackedPayloadRetentionDays: 7 });
  });

  it.each(['0', '31', 'abc'])('rejects ACKed payload window %s', (value) => {
    expect(() =>
      readTursoPricePayloadCompactionPolicy({ TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS: value })
    ).toThrow('Invalid TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS');
  });
});
