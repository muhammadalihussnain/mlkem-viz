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

export interface EncapResult {
  // Bob's randomness (all CBD small)
  r: Polynomial[];        // random vector r, 2 polynomials
  e1: Polynomial[];       // error vector e1, 2 polynomials
  e2: Polynomial;         // error scalar e2, 1 polynomial
  m: Uint8Array;          // shared secret — 32 random bytes
  encM: Polynomial;       // encode(m) as polynomial

  // NTT intermediates — u = Aᵀr + e1
  nttAT: Matrix;          // NTT(Aᵀ) — column-row swap of NTT(A)
  nttR: Polynomial[];     // NTT(r)
  nttAtR: Polynomial[];   // NTT(Aᵀ)·NTT(r) pointwise (row 0 terms shown)
  atR: Polynomial[];      // Aᵀr = INTT(NTT(Aᵀ)·NTT(r))
  u: Polynomial[];        // u = Aᵀr + e1  (16-bit, 2×512B = 1024B)
  uEnc: number[][];       // encode12(u)  (12-bit, 2×384B = 768B)

  // v = tᵀr + e2 + encode(m)
  tTR: Polynomial;        // tᵀr = Σ t[k]·r[k]
  v: Polynomial;          // v = tᵀr + e2 + encode(m)  (16-bit, 256 coefficients)
  vEnc: number[];         // encode12(v)  (12-bit, 384B)
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
  encM: number;                        // encode(m)[i]  — message polynomial
  tTR: number;                         // tᵀr[i]
  e2: number;                          // e2[i]
  v: number;                           // v = tᵀr + e2 + encode(m)  (16-bit)
  vEnc: number;                        // encode12(v)   (12-bit)
}
