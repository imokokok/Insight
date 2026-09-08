import { computeMeasuredFieldsHash, computePreTradeUidsHash } from '../executionCommitments';

const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;
const SOURCE_UID = `0x${'0'.repeat(63)}1`;
const DESTINATION_UID = `0x${'0'.repeat(63)}2`;

describe('execution commitments', () => {
  it('keeps the measured-field commitment deterministic', () => {
    expect(computeMeasuredFieldsHash(['quotedAmountUsd', 'actualFeeUsd', 'actualFeeUsd'])).toBe(
      computeMeasuredFieldsHash(['actualFeeUsd', 'quotedAmountUsd'])
    );
  });

  describe('preTradeUidsHash zero-sentinel rule (VERITAS F15)', () => {
    it('publishes stable one- and two-gate vectors', () => {
      expect(computePreTradeUidsHash([SOURCE_UID])).toBe(
        '0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'
      );
      expect(computePreTradeUidsHash([SOURCE_UID, DESTINATION_UID])).toBe(
        '0xe90b7bceb6e7df5418fb78d8ee546e97c83a08bbccc01a0644d599ccd2a7c2e0'
      );
    });

    it('omits a zero destination sentinel instead of hashing it as a gate', () => {
      expect(computePreTradeUidsHash([SOURCE_UID, ZERO_BYTES32])).toBe(
        computePreTradeUidsHash([SOURCE_UID])
      );
    });

    it('maps empty and zero-only inputs to keccak256(empty)', () => {
      const emptyHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
      expect(computePreTradeUidsHash([])).toBe(emptyHash);
      expect(computePreTradeUidsHash([ZERO_BYTES32])).toBe(emptyHash);
    });

    it('preserves route order and accepts an unprefixed uid', () => {
      expect(computePreTradeUidsHash([DESTINATION_UID, SOURCE_UID])).toBe(
        '0xd9d16d34ffb15ba3a3d852f0d403e2ce1d691fb54de27ac87cd2f993f3ec330f'
      );
      expect(computePreTradeUidsHash([SOURCE_UID.slice(2)])).toBe(
        computePreTradeUidsHash([SOURCE_UID])
      );
    });
  });
});
