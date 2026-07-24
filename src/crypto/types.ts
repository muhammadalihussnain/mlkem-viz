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
  s0: number; // secret vector s[0] coefficient (CBD, small)
  s1: number; // secret vector s[1] coefficient (CBD, small)
  a00: number;
  a01: number;
  a10: number;
  a11: number;
  as0: number;
  as1: number;
  t0_raw: number;
  t1_raw: number;
  t0_enc: number;
  t1_enc: number;
  t0_enc_poly1: number;
  t1_enc_poly1: number;
}
