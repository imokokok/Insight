import { GET } from '../route';
import { NextResponse } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('/api/prices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return prices successfully', async () => {
    const response = await GET();
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('prices');
    expect(response.data).toHaveProperty('cached');
    expect(response.data).toHaveProperty('timestamp');
  });

  it('should return cached prices on subsequent requests', async () => {
    const response1 = await GET();
    const response2 = await GET();
    
    expect(response2.data.cached).toBe(true);
  });

  it('should include USDT price as 1.0', async () => {
    const response = await GET();
    
    expect(response.data.prices.USDT).toBe(1.0);
  });

  it('should handle errors gracefully', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const response = await GET();
    
    expect(response.status).toBe(500);
    expect(response.data).toHaveProperty('error');
    
    global.fetch = originalFetch;
  });
});
