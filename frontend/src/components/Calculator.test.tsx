import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Calculator } from './Calculator';
import { ApiError, calculate, type CalculationResponse } from '../api/calculator';

// The component is tested against a stubbed client: what matters here is the
// keypad behaviour, not the transport, which has its own tests.
vi.mock('../api/calculator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/calculator')>();
  return { ...actual, calculate: vi.fn() };
});

const calculateMock = vi.mocked(calculate);

/** Presses keys by their accessible name, in order. */
async function press(user: ReturnType<typeof userEvent.setup>, ...labels: string[]) {
  for (const label of labels) {
    await user.click(screen.getByRole('button', { name: label }));
  }
}

function display() {
  return screen.getByRole('status');
}

describe('<Calculator />', () => {
  beforeEach(() => {
    calculateMock.mockReset();
  });

  it('sends the keyed operands and shows the result on the screen', async () => {
    calculateMock.mockResolvedValue({ operation: 'add', a: 7, b: 5, result: 12 });
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '7', 'Add', '5', 'Equals');

    expect(calculateMock).toHaveBeenCalledWith('add', 7, 5);
    await waitFor(() => expect(display()).toHaveTextContent(/^12$/));
  });

  it('builds multi-digit operands and clears them with AC', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '4', '2');
    expect(display()).toHaveTextContent(/^42$/);

    await press(user, 'All clear');
    expect(display()).toHaveTextContent(/^0$/);
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it('shows the error message returned by the API', async () => {
    calculateMock.mockRejectedValue(new ApiError('division by zero'));
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '1', 'Divide', '0', 'Equals');

    expect(await screen.findByRole('alert')).toHaveTextContent(/division by zero/i);
  });

  it('applies the square root to a single operand without equals', async () => {
    calculateMock.mockResolvedValue({ operation: 'sqrt', a: 9, b: 0, result: 3 });
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '9', 'Square root');

    expect(calculateMock).toHaveBeenCalledWith('sqrt', 9, undefined);
    await waitFor(() => expect(display()).toHaveTextContent(/^3$/));
  });

  it('caps the decimals and keeps the operation that produced the result', async () => {
    calculateMock.mockResolvedValue({ operation: 'sqrt', a: 8, b: 0, result: Math.sqrt(8) });
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '8', 'Square root');

    await waitFor(() => expect(display()).toHaveTextContent(/^2\.82842712$/));
    expect(screen.getByText('√8 =')).toBeInTheDocument();
  });

  it('disables the keypad while a request is in flight', async () => {
    let settle: (response: CalculationResponse) => void = () => {};
    calculateMock.mockImplementation(
      () =>
        new Promise<CalculationResponse>((resolve) => {
          settle = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<Calculator />);

    await press(user, '7', 'Add', '5', 'Equals');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Equals' })).toBeDisabled());

    settle({ operation: 'add', a: 7, b: 5, result: 12 });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Equals' })).toBeEnabled());
  });
});
