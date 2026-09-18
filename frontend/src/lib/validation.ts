/**
 * Parses user input into a finite number. Returns null when the input is not a
 * usable number, leaving the message to the caller.
 *
 * The backend validates again: this only exists to give immediate feedback and
 * avoid pointless round trips.
 */
export function parseOperand(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}