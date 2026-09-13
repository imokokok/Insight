import { recordExecutionReceipt } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';

import { executionReceiptTool } from '../executionReceiptTools';

jest.mock('@/lib/execution/executionReceiptService', () => ({ issueExecutionReceipt: jest.fn() }));
jest.mock('@/lib/execution/executionReceiptAudit', () => ({ recordExecutionReceipt: jest.fn() }));

const mockedIssue = issueExecutionReceipt as jest.MockedFunction<typeof issueExecutionReceipt>;
const mockedRecord = recordExecutionReceipt as jest.MockedFunction<typeof recordExecutionReceipt>;

describe('execution_receipt MCP error semantics', () => {
  it('throws business failures so executeTool marks the call as an error', async () => {
    mockedIssue.mockResolvedValue({
      ok: false,
      code: 'TRANSACTION_NOT_FOUND',
      message: 'not found',
    });

    await expect(executionReceiptTool.handler({} as never)).rejects.toThrow(
      'execution_receipt failed (TRANSACTION_NOT_FOUND): not found'
    );
  });

  it('throws when a signed receipt cannot be durably audited', async () => {
    mockedIssue.mockResolvedValue({
      ok: true,
      receipt: { data: {} },
    } as never);
    mockedRecord.mockRejectedValue(new Error('database unavailable'));

    await expect(executionReceiptTool.handler({} as never)).rejects.toThrow(
      'AUDIT_PERSISTENCE_FAILED'
    );
  });
});
