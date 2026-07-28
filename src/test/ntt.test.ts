/**
 * NTT tests — FIPS 203 §4.3 correctness
 */

import { describe, it, expect } from 'vitest';
import { ntt, inverseNtt, nttMultiply, modQ } from '../crypto/ntt';
import { N, Q } from '../crypto/types';

// ── modQ ──────────────────────────────────────────────────────────────────────

describe('modQ', () => {
  it('maps 0 → 0', () => expect(modQ(0)).toBe(0));
  it('maps Q → 0', () => expect(modQ(Q)).toBe(0));
  it('maps -1 → Q-1', () => expect(modQ(-1)).toBe(Q - 1));
  it('maps -Q → 0', () => expect(modQ(-Q)).toBe(0));
  it('maps Q+1 → 1', () => expect(modQ(Q + 1)).toBe(1));
  it('stays in [0, Q)', () => {
    for (const v of [-100000, -1, 0, 1, Q - 1, Q, Q + 1, 99999])
      expect(modQ(v)).toBeGreaterThanOrEqual(0), expect(modQ(v)).toBeLessThan(Q);
  });
  it('normalises -0 to 0', () => expect(modQ(-0)).toBe(0));
});

// ── NTT properties ────────────────────────────────────────────────────────────

function randomPoly(): number[] {
  return Array.from({ length: N }, () => Math.floor(Math.random() * Q));
}

describe('ntt output range', () => {
  it('all coefficients in [0, Q)', () => {
    const f = randomPoly();
    ntt(f).forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
  });
  it('output length is N', () => expect(ntt(randomPoly())).toHaveLength(N));
});

describe('inverseNtt output range', () => {
  it('all coefficients in [0, Q)', () => {
    const f = randomPoly();
    inverseNtt(f).forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
  });
  it('output length is N', () => expect(inverseNtt(randomPoly())).toHaveLength(N));
});

// ── FIPS 203 requirement: INTT(NTT(f)) = f ────────────────────────────────────

describe('NTT round-trip', () => {
  it('INTT(NTT(f)) == f for zero poly', () => {
    const f = new Array(N).fill(0);
    const out = inverseNtt(ntt(f));
    out.forEach((c, i) => expect(c).toBe(f[i]));
  });

  it('INTT(NTT(f)) == f for basis vector e_0', () => {
    const f = new Array(N).fill(0); f[0] = 1;
    const out = inverseNtt(ntt(f));
    out.forEach((c, i) => expect(c).toBe(f[i]));
  });

  it('INTT(NTT(f)) == f for basis vector e_1', () => {
    const f = new Array(N).fill(0); f[1] = 1;
    const out = inverseNtt(ntt(f));
    out.forEach((c, i) => expect(c).toBe(f[i]));
  });

  it('INTT(NTT(f)) == f for constant poly f=1', () => {
    const f = new Array(N).fill(1);
    const out = inverseNtt(ntt(f));
    out.forEach((c, i) => expect(c).toBe(f[i]));
  });

  it('INTT(NTT(f)) == f for random poly (5 trials)', () => {
    for (let t = 0; t < 5; t++) {
      const f = randomPoly();
      const out = inverseNtt(ntt(f));
      out.forEach((c, i) => expect(c).toBe(f[i]));
    }
  });
});

// ── NTT linearity: NTT(f+g) = NTT(f) + NTT(g) ───────────────────────────────

describe('NTT linearity', () => {
  it('NTT(f+g) == NTT(f) + NTT(g) (mod q)', () => {
    const f = randomPoly();
    const g = randomPoly();
    const fg = f.map((c, i) => modQ(c + g[i]));
    const lhs = ntt(fg);
    const rhs = ntt(f).map((c, i) => modQ(c + ntt(g)[i]));
    lhs.forEach((c, i) => expect(c).toBe(rhs[i]));
  });
});

// ── nttMultiply ───────────────────────────────────────────────────────────────

describe('nttMultiply', () => {
  it('output length is N', () => {
    expect(nttMultiply(randomPoly(), randomPoly())).toHaveLength(N);
  });

  it('all coefficients in [0, Q)', () => {
    const p = nttMultiply(ntt(randomPoly()), ntt(randomPoly()));
    p.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
  });

  it('multiplication by zero gives zero', () => {
    const zero = new Array(N).fill(0);
    nttMultiply(ntt(randomPoly()), zero).forEach(c => expect(c).toBe(0));
  });

  it('multiplication by NTT(1) is identity', () => {
    // NTT(1): poly [1, 0, 0, ...0]
    const one = new Array(N).fill(0); one[0] = 1;
    const f   = randomPoly();
    const nttF     = ntt(f);
    const nttOne   = ntt(one);
    const product  = nttMultiply(nttF, nttOne);
    const result   = inverseNtt(product);
    result.forEach((c, i) => expect(c).toBe(f[i]));
  });

  it('commutativity: a⊙b == b⊙a', () => {
    const a = ntt(randomPoly()); const b = ntt(randomPoly());
    const ab = nttMultiply(a, b); const ba = nttMultiply(b, a);
    ab.forEach((c, i) => expect(c).toBe(ba[i]));
  });

  // FIPS 203 §4.3: polynomial multiplication in ℤ_q[x]/(x^256+1)
  // NTT enables: INTT(NTT(f) ⊙ NTT(g)) = f·g mod (x^256+1, q)
  it('INTT(NTT(f)⊙NTT(g)) = schoolbook f*g mod (x^256+1, q) for small polys', () => {
    // f = x, g = x^255 → f*g = x^256 ≡ -1 mod (x^256+1) → coeff[0] = -1 ≡ Q-1
    const f = new Array(N).fill(0); f[1]   = 1;   // x
    const g = new Array(N).fill(0); g[255] = 1;   // x^255
    const product = inverseNtt(nttMultiply(ntt(f), ntt(g)));
    // x · x^255 = x^256 ≡ -x^0 = -1 ≡ Q-1
    expect(product[0]).toBe(Q - 1);
    // all other coefficients should be 0
    for (let i = 1; i < N; i++) expect(product[i]).toBe(0);
  });
});
