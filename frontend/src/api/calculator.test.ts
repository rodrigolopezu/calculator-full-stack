import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, calculate } from './calculator';

/** Builds a fetch stub that resolves with the given status and payload. */
function fetchStub(status: number, payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  });
}

describe('calculate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts both operands to the operation endpoint', async () => {
    const fetch = fetchStub(200, { operation: 'add', a: 7, b: 5, result: 12 });
    vi.stubGlobal('fetch', fetch);

    const response = await calculate('add', 7, 5);

    expect(response.result).toBe(12);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/calculate/add',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ a: 7, b: 5 }),
      }),
    );
  });

  it('omits the second operand for unary operations', async () => {
    const fetch = fetchStub(200, { operation: 'sqrt', a: 9, b: 0, result: 3 });
    vi.stubGlobal('fetch', fetch);

    await calculate('sqrt', 9);

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/calculate/sqrt',
      expect.objectContaining({ body: JSON.stringify({ a: 9 }) }),
    );
  });

  it('throws ApiError carrying the message returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      fetchStub(422, { error: { code: 'division_by_zero', message: 'division by zero' } }),
    );

    await expect(calculate('divide', 1, 0)).rejects.toThrow(ApiError);
  });
});