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
  matrixA: Matrix; // A00, A01, A10, A11
  secretVector: SecretVector; // s
  errorVector: ErrorVector; // e
  asIntermediate: Polynomial[]; // AS result (2 polynomials)
  rawT: Polynomial[]; // AS + e (raw t vector)
  encodedT1: number[][]; // Encoded high bits
  encodedT0: number[][]; // Encoded low bits
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
  s0: number;        // secret s, poly 0, coeff i  (CBD small value)
  s1: number;        // secret s, poly 1, coeff i  (CBD small value)
  a00: number;       // A[0][0][i]  16-bit
  a01: number;       // A[0][1][i]  16-bit
  a10: number;       // A[1][0][i]  16-bit
  a11: number;       // A[1][1][i]  16-bit
  as0: number;       // (AS)[0][i]  16-bit  intermediate
  as1: number;       // (AS)[1][i]  16-bit  intermediate
  t_poly0: number;   // t[0][i] = (AS+e)[0][i]  16-bit  raw (same number)
  t_poly1: number;   // t[1][i] = (AS+e)[1][i]  16-bit  raw (same number)
  // 12-bit packed: same value, just fits in 12 bits because q=3329 < 2^12
  enc0: number;      // t[0][i] encoded as 12-bit  (value unchanged: enc0 === t_poly0)
  enc1: number;      // t[1][i] encoded as 12-bit  (value unchanged: enc1 === t_poly1)
}
