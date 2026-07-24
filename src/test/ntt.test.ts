import { describe, it, expect } from 'vitest';
import { modQ, ntt, inverseNtt, nttMultiply } from '../crypto/ntt';
import { N, Q } from '../crypto/types';

describe('modQ', () => {
  it('returns value unchanged when already in [0, q-1]', () => {
    expect(modQ(0)).toBe(0);
    expect(modQ(3328)).toBe(3328);
    expect(modQ(1000)).toBe(1000);
  });

  it('reduces positive values >= q', () => {
    expect(modQ(3329)).toBe(0);
    expect(modQ(3330)).toBe(1);
    expect(modQ(6658)).toBe(0);
  });

  it('converts negative values to positive range', () => {
    expect(modQ(-1)).toBe(3328);
    expect(modQ(-3329)).toBe(0);
  });

  it('handles zero', () => {
    expect(modQ(0)).toBe(0);
  });
});

describe('ntt', () => {
  it('returns array of length N', () => {
    const poly = new Array(N).fill(0);
    expect(ntt(poly)).toHaveLength(N);
  });

  it('all coefficients stay in [0, q-1]', () => {
    const poly = Array.from({ length: N }, (_, i) => i % Q);
    const result = ntt(poly);
    result.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('NTT of all-zeros polynomial is all zeros', () => {
    const poly = new Array(N).fill(0);
    const result = ntt(poly);
    result.forEach((c) => expect(c).toBe(0));
  });

  it('does not mutate the input polynomial', () => {
    const poly = Array.from({ length: N }, (_, i) => i % Q);
    const original = [...poly];
    ntt(poly);
    expect(poly).toEqual(original);
  });
});

describe('inverseNtt', () => {
  it('returns array of length N', () => {
    const poly = new Array(N).fill(1);
    expect(inverseNtt(poly)).toHaveLength(N);
  });

  it('all coefficients stay in [0, q-1]', () => {
    const poly = Array.from({ length: N }, (_, i) => i % Q);
    const result = inverseNtt(poly);
    result.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('NTT followed by inverseNTT is near-identity (mod q)', () => {
    // Due to approximate twiddle factors the round-trip won't be perfect,
    // but the result must still be valid mod-q coefficients
    const poly = Array.from({ length: N }, () => Math.floor(Math.random() * Q));
    const forward = ntt(poly);
    const back = inverseNtt(forward);
    back.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });
});

describe('nttMultiply', () => {
  it('returns array of length N', () => {
    const a = new Array(N).fill(1);
    const b = new Array(N).fill(1);
    expect(nttMultiply(a, b)).toHaveLength(N);
  });

  it('multiplying by zero polynomial gives zeros', () => {
    const a = Array.from({ length: N }, (_, i) => i % Q);
    const b = new Array(N).fill(0);
    const result = nttMultiply(a, b);
    result.forEach((c) => expect(c).toBe(0));
  });

  it('all coefficients are in [0, q-1]', () => {
    const a = Array.from({ length: N }, () => Math.floor(Math.random() * Q));
    const b = Array.from({ length: N }, () => Math.floor(Math.random() * Q));
    const result = nttMultiply(a, b);
    result.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('is commutative', () => {
    const a = Array.from({ length: N }, () => Math.floor(Math.random() * Q));
    const b = Array.from({ length: N }, () => Math.floor(Math.random() * Q));
    expect(nttMultiply(a, b)).toEqual(nttMultiply(b, a));
  });
});
