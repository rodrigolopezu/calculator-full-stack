import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Calculator } from './Calculator';
import { ApiError, calculate } from '../api/calculator';

// The component is tested against a stubbed client: what matters here is the
// UI behaviour, not the transport, which has its own tests.
vi.mock('../api/calculator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/calculator')>();
  return { ...actual, calculate: vi.fn() };
});

const calculateMock = vi.mocked(calculate);

describe('<Calculator />', () => {
  beforeEach(() => {
    calculateMock.mockReset();
  });

  it('shows the result returned by the API', async () => {
    calculateMock.mockResolvedValue({ operation: 'add', a: 7, b: 5, result: 12 });
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByLabelText(/first number/i), '7');
    await user.type(screen.getByLabelText(/second number/i), '5');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(calculateMock).toHaveBeenCalledWith('add', 7, 5);
  });

  it('rejects invalid input without calling the API', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.type(screen.getByLabelText(/first number/i), 'abc');
    await user.type(screen.getByLabelText(/second number/i), '5');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid number/i);
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it('shows the error message returned by the API', async () => {
    calculateMock.mockRejectedValue(new ApiError('division by zero'));
    const user = userEvent.setup();
    render(<Calculator />);

    await user.selectOptions(screen.getByLabelText(/operation/i), 'divide');
    await user.type(screen.getByLabelText(/first number/i), '1');
    await user.type(screen.getByLabelText(/second number/i), '0');
    await user.click(screen.getByRole('button', { name: /calculate/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/division by zero/i);
  });

  it('hides the second operand for the square root', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await user.selectOptions(screen.getByLabelText(/operation/i), 'sqrt');

    expect(screen.queryByLabelText(/second number/i)).not.toBeInTheDocument();
  });
});