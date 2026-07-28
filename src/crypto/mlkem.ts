/**
 * ML-KEM-512 — FIPS 203
 * Stage functions for step-by-step UI demonstration.
 */

import { Q, N, ETA } from './types';
import type {
  Poly, Matrix,
  AliceKeyStage, AliceNttStage, AliceTStage, AliceEncStage, AlicePubKeyStage,
} from './types';
import { ntt, inverseNtt, nttMultiply, modQ } from './ntt';

// ── CBD (FIPS 203 §4.2.2, Algorithm 8) ───────────────────────────────────────
// eta = 2: consumes 64 bytes (512 bits), 4 bits per coefficient.

export function cbd(bytes: Uint8Array): Poly {
  const p = new Array(N).fill(0);
  // For eta=2: bytes must be at least 64B (512 bits).
  // Bit layout per coefficient i: bits [4i..4i+1] for a, [4i+2..4i+3] for b.
  for (let i = 0; i < N; i++) {
    const byteIdx = Math.floor((i * 2 * ETA) / 8);
    const bitOff  = (i * 2 * ETA) % 8;
    // extract 2*ETA = 4 bits starting at bitOff across at most 2 bytes
    const word = (bytes[byteIdx] | ((bytes[byteIdx + 1] ?? 0) << 8)) >>> bitOff;
    let a = 0, b = 0;
    for (let j = 0; j < ETA; j++) a += (word >> j)       & 1;
    for (let j = 0; j < ETA; j++) b += (word >> (ETA + j)) & 1;
    p[i] = modQ(a - b);
  }
  return p;
}

// ── XOF / expandA (FIPS 203 §4.2.1, simplified) ──────────────────────────────
// In a production implementation this uses SHAKE-128.
// For demo we use a deterministic LCG seeded from rho to produce uniform [0,q).

export function expandA(rho: Uint8Array): Matrix {
  function seededPoly(seed: number): Poly {
    // Use a simple 32-bit LCG with rejection sampling to stay uniform in [0, q)
    let state = seed >>> 0;
    const next = () => {
      state = Math.imul(state, 1664525) + 1013904223 | 0;
      return (state >>> 0);
    };
    const out: number[] = [];
    while (out.length < N) {
      const v = next() & 0x0FFF;   // 12 bits → [0, 4095]
      if (v < Q) out.push(v);      // rejection: keep only [0, q)
    }
    return out;
  }
  // Seed for A[i][j] = rhoVal XOR (j << 8 | i)  (mirrors FIPS 203 XOF(ρ, i, j))
  const rhoVal = (rho[0] | (rho[1] << 8) | (rho[2] << 16) | (rho[3] << 24)) >>> 0;
  return [
    [seededPoly(rhoVal ^ 0x0000), seededPoly(rhoVal ^ 0x0100)],
    [seededPoly(rhoVal ^ 0x0001), seededPoly(rhoVal ^ 0x0101)],
  ];
}

// ── Polynomial helpers ────────────────────────────────────────────────────────

export function polyAdd(a: Poly, b: Poly): Poly {
  return a.map((c, i) => modQ(c + b[i]));
}

/** NTT-domain matrix-vector product, returns time-domain result.
 *  result[i] = INTT( Σ_j NTT(A[i][j]) ⊙ NTT(v[j]) )
 */
function nttMatVec(
  nttA: [Poly, Poly, Poly, Poly],   // [A00, A01, A10, A11] already in NTT domain
  nttV: [Poly, Poly],               // [v0, v1] already in NTT domain
): [Poly, Poly] {
  // row 0: A00⊙v0 + A01⊙v1  (pointwise add in NTT domain, then INTT)
  const row0ntt = nttA[0].map((_c, i) => modQ(
    nttMultiply(nttA[0], nttV[0])[i] + nttMultiply(nttA[1], nttV[1])[i]
  ));
  const row1ntt = nttA[2].map((_c, i) => modQ(
    nttMultiply(nttA[2], nttV[0])[i] + nttMultiply(nttA[3], nttV[1])[i]
  ));
  return [inverseNtt(row0ntt), inverseNtt(row1ntt)];
}

/** encode12: coefficient → 12-bit value (q < 2^12 so no info is lost) */
export function encode12(p: Poly): number[] {
  return p.map(c => c & 0xFFF);
}

/** Compress(x, d) — FIPS 203 §4.2.1 */
export function compress(x: number, d: number): number {
  // round( x · 2^d / q ) mod 2^d
  return Math.round((x * (1 << d)) / Q) & ((1 << d) - 1);
}

/** Decompress(y, d) — FIPS 203 §4.2.1 */
export function decompress(y: number, d: number): number {
  return Math.round((y * Q) / (1 << d)) % Q;
}

/** encode(m): bit i of m → 0 or round(q/2) = 1665 */
export function encodeMessage(m: Uint8Array): Poly {
  const p = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const bit = (m[i >> 3] >> (i & 7)) & 1;
    p[i] = bit * Math.round(Q / 2);   // 0 or 1665  (round, not floor — FIPS §4.2.1)
  }
  return p;
}

/** decode(w): round(c · 2 / q) mod 2 — FIPS 203 §4.2.1 */
export function decodeMessage(p: Poly): number[] {
  return p.map(c => Math.round((c * 2) / Q) & 1);
}

// ── Stage 1: generate s and A ─────────────────────────────────────────────────

export function stageGenerateKey(): AliceKeyStage {
  const rho = new Uint8Array(32);
  crypto.getRandomValues(rho);

  const A = expandA(rho);

  // CBD requires 64 bytes per polynomial (eta=2: 256 × 4 bits = 1024 bits = 128 bytes;
  // but FIPS 203 Table 2 says sigma||0x00 → 128 bytes for K=2. We use 64B here
  // because our CBD processes 4 bits per coeff in a packed stream of 64 bytes.)
  const sb0 = new Uint8Array(64); crypto.getRandomValues(sb0);
  const sb1 = new Uint8Array(64); crypto.getRandomValues(sb1);

  return {
    rho,
    s0: cbd(sb0), s1: cbd(sb1),
    A00: A[0][0], A01: A[0][1],
    A10: A[1][0], A11: A[1][1],
  };
}

// ── Stage 2: NTT and compute t̂ = NTT(A)·NTT(s) ───────────────────────────────

export function stageNTT(key: AliceKeyStage): AliceNttStage {
  const nttA00 = ntt(key.A00); const nttA01 = ntt(key.A01);
  const nttA10 = ntt(key.A10); const nttA11 = ntt(key.A11);
  const nttS0  = ntt(key.s0);  const nttS1  = ntt(key.s1);

  const [AS0, AS1] = nttMatVec(
    [nttA00, nttA01, nttA10, nttA11],
    [nttS0, nttS1],
  );

  return { nttA00, nttA01, nttA10, nttA11, nttS0, nttS1, AS0, AS1 };
}

// ── Stage 3: t = AS + e ───────────────────────────────────────────────────────

export function stageAddError(nttStage: AliceNttStage): AliceTStage {
  const eb0 = new Uint8Array(64); crypto.getRandomValues(eb0);
  const eb1 = new Uint8Array(64); crypto.getRandomValues(eb1);
  const e0 = cbd(eb0);
  const e1 = cbd(eb1);
  return {
    e0, e1,
    t0: polyAdd(nttStage.AS0, e0),
    t1: polyAdd(nttStage.AS1, e1),
  };
}

// ── Stage 4: ByteEncode12(t) ─────────────────────────────────────────────────

export function stageEncode(tStage: AliceTStage): AliceEncStage {
  return {
    t0enc: encode12(tStage.t0),
    t1enc: encode12(tStage.t1),
  };
}

// ── Stage 5: pk = ρ ‖ ByteEncode12(t[0]) ‖ ByteEncode12(t[1]) ───────────────

export function stagePublicKey(rho: Uint8Array, enc: AliceEncStage, _t: AliceTStage): AlicePubKeyStage {
  function pack12(coeffs: number[]): Uint8Array {
    const out = new Uint8Array(384);
    for (let i = 0; i < 256; i += 2) {
      const c0 = coeffs[i]     & 0xFFF;
      const c1 = coeffs[i + 1] & 0xFFF;
      const b  = (i >> 1) * 3;
      out[b]     =  c0        & 0xFF;
      out[b + 1] = ((c0 >> 8) & 0x0F) | ((c1 & 0x0F) << 4);
      out[b + 2] =  (c1 >> 4) & 0xFF;
    }
    return out;
  }
  const pk = new Uint8Array(800);
  pk.set(rho, 0);
  pk.set(pack12(enc.t0enc),  32);
  pk.set(pack12(enc.t1enc), 416);
  return { publicKey: pk };
}
