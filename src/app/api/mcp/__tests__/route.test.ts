/**
 * @jest-environment node
 */

import { HEAD } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createOptionsHandler: () => () => new Response(null, { status: 204 }),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}));

describe('MCP route HEAD ingress', () => {
  it('rejects HEAD without dispatching it through the MCP transport', () => {
    const response = HEAD();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, POST, DELETE');
  });
});
