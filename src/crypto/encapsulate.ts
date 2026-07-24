/**
 * ML-KEM-512 Encapsulation (Bob side)
 *
 * Bob receives Alice's public key pk = (ρ, t).
 * Bob computes:
 *   u = Aᵀr + e1   — ciphertext vector
 *   v = tᵀr + e2 + encode(m)  — ciphertext scalar
 * and sends (u, v) to Alice.
 */

import { N, ETA } from './types';
import type { Polynomial, Matrix, KeyGenResult, EncapResult } from './types';
import { encodeMessage, compress } from './types';
import { ntt, inverseNtt, nttMultiply, modQ } from './ntt';

/** CBD sampling (same as keygen) */
function cbd(bytes: Uint8Array): Polynomial {
  const poly = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    let a = 0, b = 0;
    for (let j = 0; j < ETA; j++) {
      const bi = Math.floor((i * 2 * ETA + j) / 8);
      a += (bytes[bi] >> ((i * 2 * ETA + j) % 8)) & 1;
    }
    for (let j = 0; j < ETA; j++) {
      const bi = Math.floor((i * 2 * ETA + ETA + j) / 8);
      b += (bytes[bi] >> ((i * 2 * ETA + ETA + j) % 8)) & 1;
    }
    poly[i] = modQ(a - b);
  }
  return poly;
}

function polyAdd(a: Polynomial, b: Polynomial): Polynomial {
  return a.map((c, i) => modQ(c + b[i]));
}

function encode12(poly: Polynomial): number[] {
  return poly.map(c => c & 0xFFF);
}

/**
 * Transpose a k×k matrix of polynomials.
 * NTT(Aᵀ)[i][j] = NTT(A)[j][i]
 */
function transposeMatrix(A: Matrix): Matrix {
  const k = A.length;
  return Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => A[j][i])
  );
}

/**
 * Matrix-vector multiplication: result[i] = INTT(Σⱼ M[i][j] · v[j])
 * M and v are already in NTT domain.
 */
function nttMatVecMul(M: Matrix, v: Polynomial[]): Polynomial[] {
  return M.map(row => {
    let acc = new Array(N).fill(0);
    row.forEach((col, j) => {
      const prod = inverseNtt(nttMultiply(col, v[j]));
      acc = acc.map((c, i) => modQ(c + prod[i]));
    });
    return acc;
  });
}

export async function encapsulate(keyGen: KeyGenResult): Promise<EncapResult> {
  // ── Sample Bob's randomness ──────────────────────────────────────────────────
  const rBytes = [new Uint8Array(N), new Uint8Array(N)];
  const e1Bytes = [new Uint8Array(N), new Uint8Array(N)];
  const e2Bytes = new Uint8Array(N);
  [rBytes[0], rBytes[1], e1Bytes[0], e1Bytes[1], e2Bytes].forEach(b =>
    crypto.getRandomValues(b)
  );

  const r  = rBytes.map(cbd);
  const e1 = e1Bytes.map(cbd);
  const e2 = cbd(e2Bytes);

  // ── Shared secret m ──────────────────────────────────────────────────────────
  const m = new Uint8Array(32);
  crypto.getRandomValues(m);
  const encM = encodeMessage(m);

  // ── u = Aᵀr + e1 ────────────────────────────────────────────────────────────
  // NTT(Aᵀ) is the transpose of NTT(A)
  const nttAT = transposeMatrix(keyGen.nttA);

  // NTT(r)
  const nttR = r.map(poly => ntt(poly));

  // Pointwise products for row 0 (visualisation)
  const nttAtR: Polynomial[] = [
    nttMultiply(nttAT[0][0], nttR[0]),
    nttMultiply(nttAT[0][1], nttR[1]),
  ];

  // Full Aᵀr via INTT
  const atR = nttMatVecMul(nttAT, nttR);

  // u = Aᵀr + e1
  const u = atR.map((poly, i) => polyAdd(poly, e1[i]));
  const uEnc  = u.map(encode12);
  const uComp = u.map(poly => poly.map(c => compress(c, 10)));

  // ── v = tᵀr + e2 + encode(m) ────────────────────────────────────────────────
  const nttT = keyGen.rawT.map(poly => ntt(poly));
  const nttRpoly = nttR;

  let tTRacc = new Array(N).fill(0);
  nttT.forEach((nt, k) => {
    const prod = inverseNtt(nttMultiply(nt, nttRpoly[k]));
    tTRacc = tTRacc.map((c, i) => modQ(c + prod[i]));
  });
  const tTR = tTRacc;

  const v     = tTR.map((c, i) => modQ(c + e2[i] + encM[i]));
  const vEnc  = encode12(v);
  const vComp = v.map(c => compress(c, 4));

  return {
    r, e1, e2, m, encM,
    nttAT, nttR, nttAtR,
    atR, u, uEnc, uComp,
    tTR, v, vEnc, vComp,
  };
}

/** Build one EncapRow per coefficient index */
export function buildEncapRows(enc: EncapResult) {
  return Array.from({ length: N }, (_, i) => ({
    index: i,
    r0: enc.r[0][i],
    r1: enc.r[1][i],
    e1_0: enc.e1[0][i],
    e1_1: enc.e1[1][i],
    nttAt00: enc.nttAT[0][0][i],
    nttAt01: enc.nttAT[0][1][i],
    nttAt10: enc.nttAT[1][0][i],
    nttAt11: enc.nttAT[1][1][i],
    nttR0: enc.nttR[0][i],
    nttR1: enc.nttR[1][i],
    nttAtR0: enc.nttAtR[0][i],
    nttAtR1: enc.nttAtR[1][i],
    atR0: enc.atR[0][i],
    atR1: enc.atR[1][i],
    u0: enc.u[0][i],
    u1: enc.u[1][i],
    uEnc0: enc.uEnc[0][i],
    uEnc1: enc.uEnc[1][i],
    uComp0: enc.uComp[0][i],
    uComp1: enc.uComp[1][i],
    encM: enc.encM[i],
    tTR: enc.tTR[i],
    e2: enc.e2[i],
    v: enc.v[i],
    vEnc: enc.vEnc[i],
    vComp: enc.vComp[i],
  }));
}
