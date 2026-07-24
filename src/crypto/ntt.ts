/**
 * Number Theoretic Transform (NTT) implementation for ML-KEM-512
 */

import { Q, N } from './types';

// Precomputed twiddle factors for NTT (these are standard for Kyber/ML-KEM)
const ZETAS = new Array(128).fill(0).map((_, i) => {
  // Placeholder: In production, use actual precomputed zetas from FIPS 203
  return (17 ** i) % Q;
});

/**
 * Modular reduction to [0, q-1]
 */
export function modQ(x: number): number {
  const r = x % Q;
  return (r < 0 ? r + Q : r) || 0; // normalize -0 to 0
}

/**
 * Forward NTT transformation
 */
export function ntt(poly: number[]): number[] {
  const result = [...poly];
  let k = 0;
  
  for (let len = 128; len >= 2; len >>= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k++];
      for (let j = start; j < start + len; j++) {
        const t = modQ(zeta * result[j + len]);
        result[j + len] = modQ(result[j] - t);
        result[j] = modQ(result[j] + t);
      }
    }
  }
  
  return result;
}

/**
 * Inverse NTT transformation
 */
export function inverseNtt(poly: number[]): number[] {
  const result = [...poly];
  let k = 127;
  
  for (let len = 2; len <= 128; len <<= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k--];
      for (let j = start; j < start + len; j++) {
        const t = result[j];
        result[j] = modQ(t + result[j + len]);
        result[j + len] = modQ(zeta * (result[j + len] - t));
      }
    }
  }
  
  // Multiply by inverse of N
  const nInv = modularInverse(N, Q);
  return result.map(c => modQ(c * nInv));
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
function modularInverse(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  
  while (r !== 0) {
    const quotient = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  
  return modQ(old_s);
}

/**
 * Coefficient-wise multiplication in NTT domain
 */
export function nttMultiply(a: number[], b: number[]): number[] {
  return a.map((coeff, i) => modQ(coeff * b[i]));
}
