import { useEffect, useState } from 'react';
import { ApiError, calculate, type Operation } from '../api/calculator';
import { parseOperand } from '../lib/validation';
import './Calculator.css';

/** Symbol shown on screen for each operation. */
const SYMBOLS: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  sqrt: '√',
  percentage: '%',
};

/** Longest operand the keypad accepts, so the screen never overflows. */
const MAX_INPUT_DIGITS = 12;

/**
 * Formats a result for a fixed-width screen. It trims floating point noise
 * (0.1 + 0.2 must read as 0.3, not 0.30000000000000004), caps the decimals, and
 * falls back to exponential notation for magnitudes that would not fit.
 */
function formatResult(value: number): string {
  const rounded = Number(value.toFixed(8));

  if (rounded !== 0 && (Math.abs(rounded) >= 1e12 || Math.abs(rounded) < 1e-6)) {
    return rounded.toExponential(4);
  }

  return String(rounded);
}

type KeyVariant = 'digit' | 'operator' | 'equals' | 'utility';

interface KeyProps {
  label: string;
  symbol: string;
  variant?: KeyVariant;
  wide?: boolean;
  disabled: boolean;
  onPress: () => void;
}

/** One keypad button. The accessible name is always the spelled-out label. */
function Key({ label, symbol, variant = 'digit', wide = false, disabled, onPress }: KeyProps) {
  return (
    <button
      type="button"
      className={`key key--${variant}${wide ? ' key--wide' : ''}`}
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
    >
      {symbol}
    </button>
  );
}

export function Calculator() {
  // What the screen currently shows, kept as a string so partial input such as
  // "1." survives until the operand is parsed.
  const [display, setDisplay] = useState('0');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pending, setPending] = useState<Operation | null>(null);
  // True when the next digit starts a new operand instead of extending the
  // current one, which is the case right after a result or an operator.
  const [overwrite, setOverwrite] = useState(true);
  // The operation that produced the result on screen, kept visible above it.
  const [expression, setExpression] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function inputDigit(digit: string) {
    setError(null);
    setExpression(null);
    setDisplay((current) => {
      if (overwrite || current === '0') {
        return digit;
      }
      if (current.replace(/[-.]/g, '').length >= MAX_INPUT_DIGITS) {
        return current;
      }
      return current + digit;
    });
    setOverwrite(false);
  }

  function inputDot() {
    setError(null);
    setExpression(null);
    setDisplay((current) => {
      if (overwrite) {
        return '0.';
      }
      return current.includes('.') ? current : `${current}.`;
    });
    setOverwrite(false);
  }

  function toggleSign() {
    setDisplay((current) => {
      if (current.startsWith('-')) {
        return current.slice(1);
      }
      return current === '0' ? current : `-${current}`;
    });
  }

  function backspace() {
    setError(null);
    setDisplay((current) => {
      const next = current.slice(0, -1);
      return next === '' || next === '-' ? '0' : next;
    });
    setOverwrite(false);
  }

  function clearAll() {
    setDisplay('0');
    setAccumulator(null);
    setPending(null);
    setOverwrite(true);
    setExpression(null);
    setError(null);
  }

  function chooseOperation(operation: Operation) {
    const value = parseOperand(display);
    if (value === null) {
      setError('Enter a valid number.');
      return;
    }

    setError(null);
    setExpression(null);
    setAccumulator(value);
    setPending(operation);
    setOverwrite(true);
  }

  /** Runs one request and puts the result, or the failure, on the screen. */
  async function run(operation: Operation, a: number, b: number | undefined, label: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await calculate(operation, a, b);
      setDisplay(formatResult(response.result));
      setExpression(label);
      setAccumulator(null);
      setPending(null);
      setOverwrite(true);
    } catch (err) {
      // An ApiError carries a message meant for the user; anything else is a
      // transport failure and gets a generic one.
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function equals() {
    if (pending === null || accumulator === null) {
      return;
    }

    const value = parseOperand(display);
    if (value === null) {
      setError('Enter a valid number.');
      return;
    }

    const label = `${formatResult(accumulator)} ${SYMBOLS[pending]} ${formatResult(value)} =`;
    await run(pending, accumulator, value, label);
  }

  /** Square root is unary: it applies to what is on screen, with no equals. */
  async function squareRoot() {
    const value = parseOperand(display);
    if (value === null) {
      setError('Enter a valid number.');
      return;
    }

    await run('sqrt', value, undefined, `${SYMBOLS.sqrt}${formatResult(value)} =`);
  }

  // Registered on every render so the handler always closes over current state.
  // The cleanup removes the previous listener, so only one is ever attached.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (busy) {
        return;
      }

      const { key } = event;

      if (key >= '0' && key <= '9') {
        inputDigit(key);
      } else if (key === '.') {
        inputDot();
      } else if (key === '+') {
        chooseOperation('add');
      } else if (key === '-') {
        chooseOperation('subtract');
      } else if (key === '*') {
        chooseOperation('multiply');
      } else if (key === '/') {
        event.preventDefault();
        chooseOperation('divide');
      } else if (key === '^') {
        chooseOperation('power');
      } else if (key === '%') {
        chooseOperation('percentage');
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        void equals();
      } else if (key === 'Escape') {
        clearAll();
      } else if (key === 'Backspace') {
        backspace();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <section className="calculator" aria-label="Calculator">
      <div className="calculator__screen">
        <p className="calculator__pending">
          {pending !== null && accumulator !== null
            ? `${formatResult(accumulator)} ${SYMBOLS[pending]}`
            : (expression ?? ' ')}
        </p>
        <output className="calculator__display" aria-live="polite">
          {display}
        </output>
      </div>

      {error !== null && (
        <p className="calculator__error" role="alert">
          {error}
        </p>
      )}

      <div className="calculator__keypad">
        <Key label="All clear" symbol="AC" variant="utility" disabled={busy} onPress={clearAll} />
        <Key label="Backspace" symbol="⌫" variant="utility" disabled={busy} onPress={backspace} />
        <Key label="Square root" symbol="√" variant="operator" disabled={busy} onPress={() => void squareRoot()} />
        <Key label="Power" symbol="^" variant="operator" disabled={busy} onPress={() => chooseOperation('power')} />

        <Key label="7" symbol="7" disabled={busy} onPress={() => inputDigit('7')} />
        <Key label="8" symbol="8" disabled={busy} onPress={() => inputDigit('8')} />
        <Key label="9" symbol="9" disabled={busy} onPress={() => inputDigit('9')} />
        <Key label="Divide" symbol="÷" variant="operator" disabled={busy} onPress={() => chooseOperation('divide')} />

        <Key label="4" symbol="4" disabled={busy} onPress={() => inputDigit('4')} />
        <Key label="5" symbol="5" disabled={busy} onPress={() => inputDigit('5')} />
        <Key label="6" symbol="6" disabled={busy} onPress={() => inputDigit('6')} />
        <Key label="Multiply" symbol="×" variant="operator" disabled={busy} onPress={() => chooseOperation('multiply')} />

        <Key label="1" symbol="1" disabled={busy} onPress={() => inputDigit('1')} />
        <Key label="2" symbol="2" disabled={busy} onPress={() => inputDigit('2')} />
        <Key label="3" symbol="3" disabled={busy} onPress={() => inputDigit('3')} />
        <Key label="Subtract" symbol="−" variant="operator" disabled={busy} onPress={() => chooseOperation('subtract')} />

        <Key label="Toggle sign" symbol="±" disabled={busy} onPress={toggleSign} />
        <Key label="0" symbol="0" disabled={busy} onPress={() => inputDigit('0')} />
        <Key label="Decimal point" symbol="." disabled={busy} onPress={inputDot} />
        <Key label="Add" symbol="+" variant="operator" disabled={busy} onPress={() => chooseOperation('add')} />

        <Key label="Percentage" symbol="%" variant="operator" disabled={busy} onPress={() => chooseOperation('percentage')} />
        <Key label="Equals" symbol="=" variant="equals" wide disabled={busy} onPress={() => void equals()} />
      </div>
    </section>
  );
}
