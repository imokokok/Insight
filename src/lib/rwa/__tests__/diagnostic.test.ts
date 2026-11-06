/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { rwaAssessmentTool } from '../../../mcp/tools/rwaTools';
import { diagnoseRwa } from '../diagnostic';
import { RwaDiagnosticSchema } from '../schema';

const fixture = () =>
  JSON.parse(readFileSync(join(process.cwd(), 'examples/rwa-v1/diagnostic-request.json'), 'utf8'));
afterEach(() => jest.useRealTimers());
it('uses the exact uint256 bound and keeps SDK field/error metadata', () => {
  const f = fixture();
  f.input.request.amount = (2n ** 256n - 1n).toString();
  expect(RwaDiagnosticSchema.safeParse(f).success).toBe(true);
  f.input.request.amount = (2n ** 256n).toString();
  const parsed = RwaDiagnosticSchema.safeParse(f);
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['input', 'request', 'amount']);
  try {
    diagnoseRwa(f.input, f.policy, 1800000000);
    throw new Error('Expected validation error');
  } catch (error) {
    expect(error).toMatchObject({
      message: 'RWA_UINT256_OUT_OF_RANGE',
      details: {
        field: 'input.request.amount',
        constraints: { code: 'RWA_UINT256_OUT_OF_RANGE', retryable: false },
      },
    });
  }
});
it('validates fixture, publishes the exact same strict schema and never signs diagnostics', () => {
  const { input, policy } = RwaDiagnosticSchema.parse(fixture());
  const result = diagnoseRwa(input, policy, 1800000000);
  expect(result.report.evaluation.verdict).toBe('ALLOW');
  expect(result.mayAuthorizeExecution).toBe(false);
  expect(result.evidenceProvenance).toBe('caller-supplied-unverified');
  expect(result).not.toHaveProperty('signature');
  expect(result.report).not.toHaveProperty('signature');
  expect(RwaDiagnosticSchema.toJSONSchema()).toEqual(
    JSON.parse(readFileSync(join(process.cwd(), 'public/rwa-assessment.schema.json'), 'utf8'))
  );
});
it('rejects unknown fields, wrong enums, oversize arrays and invalid semantic policy', () => {
  const f = fixture();
  f.input.unknown = 'ignored?';
  expect(RwaDiagnosticSchema.safeParse(f).success).toBe(false);
  delete f.input.unknown;
  f.input.market.halt = 'clear';
  expect(RwaDiagnosticSchema.safeParse(f).success).toBe(false);
  f.input.market.halt = 'CLEAR';
  f.input.prices = Array(33).fill(f.input.prices[0]);
  expect(RwaDiagnosticSchema.safeParse(f).success).toBe(false);
  const invalid = fixture();
  invalid.policy.actions.buy.priceRequired = false;
  expect(() => diagnoseRwa(invalid.input, invalid.policy, 1800000000)).toThrow();
});
it('MCP uses the same unsigned diagnosis and does not refresh caller timestamps', async () => {
  jest.useFakeTimers().setSystemTime(new Date(1800000000 * 1000));
  const result = JSON.parse(String(await rwaAssessmentTool.handler(fixture())));
  expect(result.report.evaluation.verdict).toBe('ALLOW');
  expect(result.mayAuthorizeExecution).toBe(false);
  jest.setSystemTime(new Date(1800000120 * 1000));
  const stale = JSON.parse(String(await rwaAssessmentTool.handler(fixture())));
  expect(stale.report.evaluation.verdict).not.toBe('ALLOW');
});
