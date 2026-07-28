/**
 * Bob Encapsulation + Alice Decapsulation (FIPS 203 §7.2 / §7.3)
 */

import type {
  AliceKeyStage, AliceNttStage, AliceTStage, AlicePubKeyStage,
  BobAStage, BobUVStage, BobCompressStage,
  AliceSTUStage, AliceDecapStage, CompareStage,
} from './types';
import { cbd, expandA, polyAdd, encodeMessage, decodeMessage, compress } from './mlkem';
import { ntt, inverseNtt, nttMultiply, modQ } from './ntt';

// ── Bob Stage 1: derive A from ρ (XOF) ───────────────────────────────────────

export function stageBobGenerateA(pk: AlicePubKeyStage, aliceKey: AliceKeyStage): BobAStage {
  const rho = pk.publicKey.slice(0, 32);
  const A   = expandA(rho);

  const aMatch = [
    [A[0][0], aliceKey.A00],
    [A[0][1], aliceKey.A01],
    [A[1][0], aliceKey.A10],
    [A[1][1], aliceKey.A11],
  ].every(([b, a]) => b.every((c, i) => c === a[i]));

  if (!aMatch) console.warn('[ML-KEM] Bob A ≠ Alice A');

  return { bobA00: A[0][0], bobA01: A[0][1], bobA10: A[1][0], bobA11: A[1][1], aMatch };
}

// ── Bob Stage 2: u = A^T·r + e1,  v = t^T·r + e2 + encode(m) ─────────────────

export function stageBobComputeUV(
  tStage: AliceTStage,
  _nttStage: AliceNttStage,
  bobA: BobAStage,
): BobUVStage {
  // Random secret m (256 bits = 32 bytes)
  const m = new Uint8Array(32);
  crypto.getRandomValues(m);
  const encM = encodeMessage(m);

  // Bob's randomness: r, e1, e2  (CBD, eta=2, 64 bytes each)
  const rb0 = new Uint8Array(64); crypto.getRandomValues(rb0);
  const rb1 = new Uint8Array(64); crypto.getRandomValues(rb1);
  const e1b0 = new Uint8Array(64); crypto.getRandomValues(e1b0);
  const e1b1 = new Uint8Array(64); crypto.getRandomValues(e1b1);
  const e2b  = new Uint8Array(64); crypto.getRandomValues(e2b);

  const r0 = cbd(rb0);   const r1 = cbd(rb1);
  const e1_0 = cbd(e1b0); const e1_1 = cbd(e1b1);
  const e2   = cbd(e2b);

  // NTT(r)
  const nttR0 = ntt(r0); const nttR1 = ntt(r1);

  // A^T·r  (transpose: A^T[i][j] = A[j][i])
  // row 0: A00·r0 + A10·r1
  // row 1: A01·r0 + A11·r1
  const nttA00 = ntt(bobA.bobA00); const nttA01 = ntt(bobA.bobA01);
  const nttA10 = ntt(bobA.bobA10); const nttA11 = ntt(bobA.bobA11);

  const atR0ntt = nttA00.map((_c, i) => modQ(
    nttMultiply(nttA00, nttR0)[i] + nttMultiply(nttA10, nttR1)[i]
  ));
  const atR1ntt = nttA01.map((_c, i) => modQ(
    nttMultiply(nttA01, nttR0)[i] + nttMultiply(nttA11, nttR1)[i]
  ));

  const AtR0 = inverseNtt(atR0ntt);
  const AtR1 = inverseNtt(atR1ntt);

  const U0 = polyAdd(AtR0, e1_0);
  const U1 = polyAdd(AtR1, e1_1);

  // V = t^T·r + e2 + encode(m)
  // t^T·r = t0·r0 + t1·r1  (NTT domain add, then INTT)
  const nttT0 = ntt(tStage.t0); const nttT1 = ntt(tStage.t1);
  const tTrntt = nttT0.map((_c, i) => modQ(
    nttMultiply(nttT0, nttR0)[i] + nttMultiply(nttT1, nttR1)[i]
  ));
  const tTr = inverseNtt(tTrntt);
  const V   = tTr.map((c, i) => modQ(c + e2[i] + encM[i]));

  return { m, encM, r0, r1, e1_0, e1_1, e2, nttR0, nttR1, AtR0, AtR1, U0, U1, tTr, V };
}

// ── Bob Stage 3: compress ciphertext ─────────────────────────────────────────

export function stageBobCompress(uv: BobUVStage): BobCompressStage {
  return {
    U0c: uv.U0.map(c => compress(c, 10)),
    U1c: uv.U1.map(c => compress(c, 10)),
    Vc:  uv.V.map(c  => compress(c, 4)),
  };
}

// ── Alice Decap Stage 1: s^T·u ────────────────────────────────────────────────

export function stageAliceSTU(
  _aliceKey: AliceKeyStage,
  nttStage: AliceNttStage,
  uv: BobUVStage,
): AliceSTUStage {
  const nttU0 = ntt(uv.U0); const nttU1 = ntt(uv.U1);
  // s^T·u = s0·u0 + s1·u1  (NTT pointwise, then INTT)
  const sTUntt = nttStage.nttS0.map((_c, i) => modQ(
    nttMultiply(nttStage.nttS0, nttU0)[i] + nttMultiply(nttStage.nttS1, nttU1)[i]
  ));
  const sTU = inverseNtt(sTUntt);
  return { nttU0, nttU1, sTU };
}

// ── Alice Decap Stage 2: w = v - s^T·u,  decode(w) ────────────────────────────

export function stageAliceDecap(uv: BobUVStage, stu: AliceSTUStage): AliceDecapStage {
  const w         = uv.V.map((c, i) => modQ(c - stu.sTU[i]));
  const noise     = w.map((c, i) => modQ(c - uv.encM[i]));
  const recovered = decodeMessage(w);   // 256 bits: 0 or 1

  // Pack 256 recovered bits back into 32 bytes
  const recoveredBytes = new Uint8Array(32);
  for (let i = 0; i < 256; i++) {
    if (recovered[i]) recoveredBytes[i >> 3] |= 1 << (i & 7);
  }

  return { w, noise, recovered, recoveredBytes };
}

// ── Compare Bob's m vs Alice's recovered ─────────────────────────────────────

export function stageCompare(m: Uint8Array, recovered: number[]): CompareStage {
  const bobBits = Array.from(m).flatMap(b =>
    Array.from({ length: 8 }, (_, i) => (b >> i) & 1)
  );
  const errCount = bobBits.filter((b, i) => b !== recovered[i]).length;
  return { bobBits, aliceBits: recovered, errCount };
}
