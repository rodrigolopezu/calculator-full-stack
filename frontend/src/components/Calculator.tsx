import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, calculate, type Operation } from '../api/calculator';
import { parseOperand } from '../lib/validation';

const OPERATIONS: Array<{ value: Operation; label: string }> = [
  { value: 'add', label: 'Add (+)' },
  { value: 'subtract', label: 'Subtract (-)' },
  { value: 'multiply', label: 'Multiply (x)' },
  { value: 'divide', label: 'Divide (/)' },
  { value: 'power', label: 'Power (^)' },
  { value: 'sqrt', label: 'Square root' },
  { value: 'percentage', label: 'Percentage (%)' },
];

export function Calculator() {
  const [operation, setOperation] = useState<Operation>('add');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Square root is the only unary operation, so it hides the second operand.
  const isUnary = operation === 'sqrt';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const parsedA = parseOperand(a);
    if (parsedA === null) {
      setError('Enter a valid number in the first field.');
      return;
    }

    let parsedB: number | undefined;
    if (!isUnary) {
      const value = parseOperand(b);
      if (value === null) {
        setError('Enter a valid number in the second field.');
        return;
      }
      parsedB = value;
    }

    setLoading(true);
    try {
      const response = await calculate(operation, parsedA, parsedB);
      setResult(response.result);
    } catch (err) {
      // An ApiError carries a message meant for the user; anything else is a
      // transport failure and gets a generic one.
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1>Calculator</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="operation">Operation</label>
          <select
            id="operation"
            value={operation}
            onChange={(event) => setOperation(event.target.value as Operation)}
          >
            {OPERATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="a">First number</label>
          <input id="a" inputMode="decimal" value={a} onChange={(event) => setA(event.target.value)} />
        </div>

        {!isUnary && (
          <div>
            <label htmlFor="b">Second number</label>
            <input id="b" inputMode="decimal" value={b} onChange={(event) => setB(event.target.value)} />
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {result !== null && (
        <p>
          Result: <output>{result}</output>
        </p>
      )}
    </section>
  );
}