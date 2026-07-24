/**
 * Core data structures for ML-KEM-512 implementation
 */

export const Q = 3329;  // Modulus
export const N = 256;   // Polynomial degree
export const K = 2;     // Matrix dimension for ML-KEM-512
export const ETA = 2;   // CBD parameter

export type Polynomial = number[];   // 256 coefficients in [0, 3328]
export type Matrix     = Polynomial[][]; // k×k matrix of polynomials

export interface SecretVector { s0: Polynomial; s1: Polynomial; }
export interface ErrorVector  { e0: Polynomial; e1: Polynomial; }
export interface EncodedPolynomial { t1: number[]; t0: number[]; }

// ── Key generation result ──────────────────────────────────────────────────────

export interface KeyGenResult {
  rho: Uint8Array;              // ρ — 32-byte seed for matrix A
  matrixA: Matrix;              // A
  nttA: Matrix;                 // NTT(A)
  secretVector: SecretVector;   // s
  nttS: Polynomial[];           // NTT(s)
  errorVector: ErrorVector;     // e
  asIntermediate: Polynomial[]; // INTT(NTT(A)·NTT(s)) = AS
  nttProduct: Polynomial[];     // NTT(A)·NTT(s) pointwise (row 0)
  rawT: Polynomial[];           // t = AS + e
  encodedT1: number[][];        // encode12(t) values
  encodedT0: number[][];        // (high-nibble info, kept for compat)
  publicKey: Uint8Array;        // ρ ∥ encode12(t[0]) ∥ encode12(t[1]) = 800 B
  timing: {
    nttTime: number;
    matrixMultTime: number;
    errorAddTime: number;
    encodingTime: number;
    totalTime: number;
  };
}

// ── Encapsulation result (Bob side) ───────────────────────────────────────────

/**
 * Encode a 32-byte message m into a polynomial.
 * Each bit maps to one coefficient: bit=1 → ⌊q/2⌋ = 1664, bit=0 → 0.
 * 32 bytes × 8 bits = 256 coefficients.
 */
export function encodeMessage(m: Uint8Array): Polynomial {
  const poly = new Array(N).fill(0);
  for (let i = 0; i < 256; i++) {
    const bit = (m[Math.floor(i / 8)] >> (i % 8)) & 1;
    poly[i] = bit * Math.floor(Q / 2); // 0 or 1664
  }
  return poly;
}

/**
 * Compress(x, d) = round(x · 2^d / q) mod 2^d  (FIPS 203 §4.2.1)
 * Maps a coefficient in [0, q-1] to [0, 2^d - 1]
 */
export function compress(x: number, d: number): number {
  return Math.round((x * (1 << d)) / Q) & ((1 << d) - 1);
}

export interface EncapResult {
  // Bob's randomness (all CBD small)
  r: Polynomial[];
  e1: Polynomial[];
  e2: Polynomial;
  m: Uint8Array;
  encM: Polynomial;

  // NTT intermediates — u = Aᵀr + e1
  nttAT: Matrix;
  nttR: Polynomial[];
  nttAtR: Polynomial[];
  atR: Polynomial[];
  u: Polynomial[];        // u = Aᵀr + e1  (16-bit, 2×512B = 1024B)
  uEnc: number[][];       // encode12(u)   (12-bit, 2×384B = 768B)
  uComp: number[][];      // Compress(u, 10) — 10-bit, 2×320B = 640B

  // v = tᵀr + e2 + encode(m)
  tTR: Polynomial;
  v: Polynomial;          // v = tᵀr + e2 + encode(m)  (16-bit, 512B)
  vEnc: number[];         // encode12(v)  (12-bit, 384B)
  vComp: number[];        // Compress(v, 4) — 4-bit, 128B
}

// ── Per-coefficient row (Alice keygen pipeline) ────────────────────────────────

export interface CoefficientRow {
  index: number;
  s0: number; s1: number;              // secret s
  a00: number; a01: number;
  a10: number; a11: number;            // matrix A
  nttA00: number; nttA01: number;
  nttA10: number; nttA11: number;      // NTT(A)
  nttS0: number; nttS1: number;        // NTT(s)
  nttProd0: number; nttProd1: number;  // NTT(A)·NTT(s)
  as0: number; as1: number;            // AS = INTT(·)
  t_poly0: number; t_poly1: number;    // t = AS + e
  enc0: number; enc1: number;          // encode12(t)
}

// ── Per-coefficient row (Bob encapsulation pipeline) ──────────────────────────

export interface EncapRow {
  index: number;
  r0: number; r1: number;              // r — Bob's random vector
  e1_0: number; e1_1: number;          // e1 — Bob's error vector
  nttAt00: number; nttAt01: number;
  nttAt10: number; nttAt11: number;    // NTT(Aᵀ)
  nttR0: number; nttR1: number;        // NTT(r)
  nttAtR0: number; nttAtR1: number;    // NTT(Aᵀ)·NTT(r)
  atR0: number; atR1: number;          // Aᵀr = INTT(·)
  u0: number; u1: number;              // u = Aᵀr + e1  (16-bit)
  uEnc0: number; uEnc1: number;        // encode12(u)   (12-bit)
  uComp0: number; uComp1: number;      // Compress(u, 10) — 10-bit
  encM: number;                        // encode(m)[i]
  tTR: number;                         // tᵀr[i]
  e2: number;                          // e2[i]
  v: number;                           // v = tᵀr + e2 + encode(m)  (16-bit)
  vEnc: number;                        // encode12(v)   (12-bit)
  vComp: number;                       // Compress(v, 4) — 4-bit
}
