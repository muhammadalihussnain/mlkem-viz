/**
 * Core data structures for ML-KEM-512 implementation
 */

export const Q = 3329; // Modulus for ML-KEM-512
export const N = 256; // Polynomial degree
export const K = 2; // Matrix dimension for ML-KEM-512
export const ETA = 2; // CBD parameter

export type Polynomial = number[]; // 256 coefficients in [0, 3328]

export type Matrix = Polynomial[][]; // 2x2 matrix of polynomials

export interface SecretVector {
  s0: Polynomial;
  s1: Polynomial;
}

export interface ErrorVector {
  e0: Polynomial;
  e1: Polynomial;
}

export interface EncodedPolynomial {
  t1: number[]; // High 12 bits
  t0: number[]; // Low 12 bits
}

export interface KeyGenResult {
  rho: Uint8Array;           // ρ (rho) — 32-byte seed used to generate matrix A
  matrixA: Matrix;           // A — generated from ρ
  nttA: Matrix;              // NTT(A)
  secretVector: SecretVector; // s
  nttS: Polynomial[];        // NTT(s)
  errorVector: ErrorVector;  // e
  asIntermediate: Polynomial[]; // AS
  nttProduct: Polynomial[];  // NTT(A)·NTT(s) pointwise
  rawT: Polynomial[];        // t = AS + e
  encodedT1: number[][];     // encode12(t) — same values as rawT, 12-bit storage
  encodedT0: number[][];     // (unused, kept for compatibility)
  publicKey: Uint8Array;     // ρ || encode12(t[0]) || encode12(t[1]) = 32 + 384 + 384 = 800 bytes
  timing: {
    nttTime: number;
    matrixMultTime: number;
    errorAddTime: number;
    encodingTime: number;
    totalTime: number;
  };
}

export interface CoefficientRow {
  index: number;
  // Secret s (raw)
  s0: number;
  s1: number;
  // Matrix A (raw)
  a00: number;
  a01: number;
  a10: number;
  a11: number;
  // NTT(A) — forward transform of each A polynomial
  nttA00: number;
  nttA01: number;
  nttA10: number;
  nttA11: number;
  // NTT(s) — forward transform of s
  nttS0: number;
  nttS1: number;
  // NTT(A)·NTT(s) pointwise product (row 0 of matrix result: A[0][0]*s[0] + A[0][1]*s[1])
  nttProd0: number;
  nttProd1: number;
  // INTT(NTT(A)·NTT(s)) = AS (polynomial multiplication result)
  as0: number;
  as1: number;
  // t = AS + e (raw public key, 16-bit)
  t_poly0: number;
  t_poly1: number;
  // Encoded t (12-bit, same value, smaller storage)
  enc0: number;
  enc1: number;
}
