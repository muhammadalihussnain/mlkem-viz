/**
 * ML-KEM-512 types — FIPS 203
 */

export const Q   = 3329;
export const N   = 256;
export const K   = 2;
export const ETA = 2;

export type Poly   = number[];   // 256 coefficients in [0, Q-1]
export type Matrix = Poly[][];   // K×K

// ── Alice key-generation stages ───────────────────────────────────────────────

export interface AliceKeyStage {
  // Stage 1 — raw secret + matrix
  rho:    Uint8Array;    // 32-byte seed
  s0:     Poly;          // secret s[0], 256 × 16-bit
  s1:     Poly;          // secret s[1]
  A00:    Poly;          // matrix A[0][0]
  A01:    Poly;
  A10:    Poly;
  A11:    Poly;
}

export interface AliceNttStage {
  nttA00: Poly;
  nttA01: Poly;
  nttA10: Poly;
  nttA11: Poly;
  nttS0:  Poly;
  nttS1:  Poly;
  // INTT(NTT(A)*NTT(S)) = AS
  AS0:    Poly;
  AS1:    Poly;
}

export interface AliceTStage {
  e0:  Poly;    // error e[0]
  e1:  Poly;    // error e[1]
  t0:  Poly;    // t[0] = AS[0] + e[0]   (raw, 512B)
  t1:  Poly;    // t[1] = AS[1] + e[1]
}

export interface AliceEncStage {
  t0enc: number[];   // encode12(t[0]) — 384B (12-bit per coeff)
  t1enc: number[];
}

export interface AlicePubKeyStage {
  publicKey: Uint8Array;   // rho(32) || enc(t0)(384) || enc(t1)(384) = 800B
}

// ── Bob encapsulation stages ──────────────────────────────────────────────────

export interface BobAStage {
  // Bob re-derives A from rho extracted from public key
  bobA00: Poly;
  bobA01: Poly;
  bobA10: Poly;
  bobA11: Poly;
  aMatch: boolean;   // does Bob's A == Alice's A?
}

export interface BobUVStage {
  m:    Uint8Array;  // 32-byte random secret (256 bits)
  encM: Poly;        // encode(m): bit → 0 or 1664

  r0:   Poly;        // Bob's random r[0]
  r1:   Poly;
  e1_0: Poly;        // Bob's error e1[0]
  e1_1: Poly;
  e2:   Poly;        // Bob's error e2 (scalar)

  // U = A^T r + e1
  nttR0:  Poly;
  nttR1:  Poly;
  AtR0:   Poly;      // A^T r [0]
  AtR1:   Poly;
  U0:     Poly;      // U[0] = AtR[0] + e1[0]   (512B)
  U1:     Poly;

  // V = t^T r + e2 + encode(m)
  tTr:    Poly;      // t^T r
  V:      Poly;      // V = tTr + e2 + encM      (512B)
}

export interface BobCompressStage {
  U0c: number[];     // Compress(U0, 10) → 640B total for both
  U1c: number[];
  Vc:  number[];     // Compress(V, 4)  → 128B
}

// ── Alice decapsulation stages ────────────────────────────────────────────────

export interface AliceSTUStage {
  nttU0: Poly;
  nttU1: Poly;
  sTU:   Poly;       // s^T u = INTT(NTT(s)·NTT(u))
}

export interface AliceDecapStage {
  w:         Poly;   // w = V - s^T u  ≈ encode(m) + noise
  noise:     Poly;   // w - encode(m)
  recovered: Poly;   // decode(w) → bits {0,1}
  recoveredBytes: Uint8Array;  // recovered bits packed back to 32 bytes
}

export interface CompareStage {
  bobBits:   number[];   // Bob's m as bits
  aliceBits: number[];   // Alice's recovered bits
  errCount:  number;     // number of differing bits
}
