/** Operations exposed by the backend. Mirrors the Go domain. */
export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage';

export interface CalculationResponse {
  operation: Operation;
  a: number;
  b: number;
  result: number;
}

interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

/** Error carrying the message the API returned, ready to show to the user. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sends one calculation to the backend. Requests go to the app's own origin:
 * Vite proxies /api in development and nginx does it in Docker.
 */
export async function calculate(
  operation: Operation,
  a: number,
  b?: number,
): Promise<CalculationResponse> {
  const response = await fetch(`/api/v1/calculate/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b === undefined ? { a } : { a, b }),
  });

  const payload = (await response.json()) as CalculationResponse | ApiErrorPayload;

  if (!response.ok) {
    throw new ApiError((payload as ApiErrorPayload).error.message);
  }

  return payload as CalculationResponse;
}