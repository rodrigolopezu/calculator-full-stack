import { describe, expect, it } from 'vitest';
import { parseOperand } from './validation';

describe('parseOperand', () => {
  it('parses integers', () => {
    expect(parseOperand('7')).toBe(7);
  });

  it('parses decimals', () => {
    expect(parseOperand('2.5')).toBe(2.5);
  });

  it('parses negative numbers', () => {
    expect(parseOperand('-3')).toBe(-3);
  });

  it('parses zero', () => {
    expect(parseOperand('0')).toBe(0);
  });

  it('ignores surrounding whitespace', () => {
    expect(parseOperand('  4 ')).toBe(4);
  });

  it('rejects an empty string', () => {
    expect(parseOperand('')).toBeNull();
  });

  it('rejects whitespace only', () => {
    expect(parseOperand('   ')).toBeNull();
  });

  it('rejects text', () => {
    expect(parseOperand('abc')).toBeNull();
  });

  it('rejects Infinity', () => {
    expect(parseOperand('Infinity')).toBeNull();
  });
});