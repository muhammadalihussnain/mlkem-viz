/**
 * NTT for ML-KEM-512 — FIPS 203 §4.3
 *
 * q = 3329, primitive root g = 17, ζ = 17
 * Bit-reversal permutation of {ζ^1, ζ^2, ..., ζ^128} gives the zeta table.
 *
 * FIPS 203 Table 1: the 128 zeta values are ζ^(BitRev7(k)) for k=1..128.
 */

import { Q, N } from './types';

// ── Barrett / modular helpers ─────────────────────────────────────────────────

export function modQ(x: number): number {
  let r = x % Q;
  if (r < 0) r += Q;
  return r === 0 ? 0 : r;      // normalise -0
}

// ── Precompute zetas via BitRev7 ──────────────────────────────────────────────

function bitRev7(x: number): number {
  let r = 0;
  for (let i = 0; i < 7; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r;
}

/** ζ^k mod q,  ζ = 17 */
function zetaPow(k: number): number {
  let r = 1;
  let base = 17;
  let exp = ((k % (Q - 1)) + (Q - 1)) % (Q - 1);
  while (exp > 0) {
    if (exp & 1) r = (r * base) % Q;
    base = (base * base) % Q;
    exp >>= 1;
  }
  return r;
}

/**
 * ZETAS[k] = ζ^(BitRev7(k)) for k = 0..127
 * Used in the Cooley–Tukey butterfly.
 */
const ZETAS: number[] = Array.from({ length: 128 }, (_, k) => zetaPow(bitRev7(k)));

// ── Forward NTT (FIPS 203 Algorithm 9) ───────────────────────────────────────

/**
 * NTT: ℤ_q[x]/(x^256+1) → NTT domain.
 * In-place Cooley–Tukey with bit-reversed zeta schedule.
 */
export function ntt(f: number[]): number[] {
  const a = [...f];
  let k = 1;                      // zeta index starts at 1 (FIPS 203 §4.3)
  for (let len = 128; len >= 2; len >>= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k++];
      for (let j = start; j < start + len; j++) {
        const t = modQ(zeta * a[j + len]);
        a[j + len] = modQ(a[j] - t);
        a[j]       = modQ(a[j] + t);
      }
    }
  }
  return a;
}

// ── Inverse NTT (FIPS 203 Algorithm 10) ──────────────────────────────────────

// 3303 = 128^{-1} mod 3329  (precomputed: 128 * 3303 ≡ 1 (mod 3329))
const N_INV_128 = 3303;

/**
 * INTT: NTT domain → ℤ_q[x]/(x^256+1).
 * Gentleman–Sande (decimation-in-frequency) butterfly.
 * Final multiply by 128^{-1} = 3303.
 */
export function inverseNtt(f: number[]): number[] {
  const a = [...f];
  let k = 127;
  for (let len = 2; len <= 128; len <<= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k--];
      for (let j = start; j < start + len; j++) {
        const t        = a[j];
        a[j]           = modQ(t + a[j + len]);
        a[j + len]     = modQ(zeta * modQ(a[j + len] - t));
      }
    }
  }
  return a.map(c => modQ(c * N_INV_128));
}

// ── Base-case multiply (FIPS 203 Algorithm 12) ───────────────────────────────

/**
 * Multiply two NTT-domain polynomials coefficient-wise using
 * the degree-1 base-case multiplication from FIPS 203 §4.3.
 *
 * The NTT ring splits into 128 quadratic factors:
 *   (x^2 - ζ^(2·BitRev7(i)+1))  for i = 0..127
 *
 * Each pair (a[2i], a[2i+1]) × (b[2i], b[2i+1]) with modulus x^2 - γ:
 *   c0 = a0·b0 + γ·a1·b1
 *   c1 = a0·b1 + a1·b0
 * where γ = ζ^(2·BitRev7(i)+1).
 */
const GAMMAS: number[] = Array.from({ length: 128 }, (_, i) =>
  zetaPow(2 * bitRev7(i) + 1)
);

export function nttMultiply(a: number[], b: number[]): number[] {
  const c = new Array(N).fill(0);
  for (let i = 0; i < 128; i++) {
    const gamma = GAMMAS[i];
    const a0 = a[2 * i],     a1 = a[2 * i + 1];
    const b0 = b[2 * i],     b1 = b[2 * i + 1];
    c[2 * i]     = modQ(a0 * b0 + modQ(gamma * modQ(a1 * b1)));
    c[2 * i + 1] = modQ(a0 * b1 + a1 * b0);
  }
  return c;
}
