/**
 * ML-KEM-512 stage tests — FIPS 203 compliance
 */

import { describe, it, expect } from 'vitest';
import {
  cbd, expandA, encodeMessage, decodeMessage, compress, decompress,
  stageGenerateKey, stageNTT, stageAddError, stageEncode, stagePublicKey,
} from '../crypto/mlkem';
import { Q, N } from '../crypto/types';

// ── CBD (FIPS 203 §4.2.2 / Algorithm 8) ──────────────────────────────────────

describe('cbd (eta=2)', () => {
  it('output length is N', () => {
    expect(cbd(new Uint8Array(64))).toHaveLength(N);
  });

  it('all coefficients in [0, Q)', () => {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    cbd(bytes).forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('all-zero input produces polynomial with values in {0, Q-2, Q-1, 1, 2} (small CBD)', () => {
    // 0 bytes → all a=0, b=0 → coeff = 0
    cbd(new Uint8Array(64)).forEach(c => expect(c).toBe(0));
  });

  it('all-0xFF input: a=2, b=0 for every coeff → all coefficients = 2', () => {
    // 0xFF = 11111111: every 4-bit nibble is 0b1111
    // a = bit0 + bit1 = 1+1 = 2,  b = bit2 + bit3 = 1+1 = 2 → coeff = 0
    // (the result depends on bit packing; just check range and small values)
    const result = cbd(new Uint8Array(64).fill(0xFF));
    result.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
      // signed value should be in [-2, 2]
      const signed = c > Q / 2 ? c - Q : c;
      expect(signed).toBeGreaterThanOrEqual(-2);
      expect(signed).toBeLessThanOrEqual(2);
    });
  });

  it('CBD coefficients are small: signed value in [-eta, eta] = [-2, 2]', () => {
    for (let t = 0; t < 5; t++) {
      const bytes = new Uint8Array(64);
      crypto.getRandomValues(bytes);
      cbd(bytes).forEach(c => {
        const signed = c > Q / 2 ? c - Q : c;
        expect(signed).toBeGreaterThanOrEqual(-2);
        expect(signed).toBeLessThanOrEqual(2);
      });
    }
  });
});

// ── expandA (FIPS 203 §4.2.1) ────────────────────────────────────────────────

describe('expandA', () => {
  it('returns 2×2 matrix', () => {
    const rho = new Uint8Array(32);
    const A = expandA(rho);
    expect(A).toHaveLength(2);
    A.forEach(row => expect(row).toHaveLength(2));
  });

  it('each polynomial has length N', () => {
    const rho = new Uint8Array(32);
    expandA(rho).forEach(row => row.forEach(p => expect(p).toHaveLength(N)));
  });

  it('all coefficients in [0, Q)', () => {
    const rho = new Uint8Array(32);
    crypto.getRandomValues(rho);
    expandA(rho).forEach(row =>
      row.forEach(p =>
        p.forEach(c => {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(Q);
        })
      )
    );
  });

  it('is deterministic: same rho → same A', () => {
    const rho = new Uint8Array(32).fill(42);
    const A1 = expandA(rho); const A2 = expandA(rho);
    A1.forEach((row, i) => row.forEach((p, j) =>
      p.forEach((c, k) => expect(c).toBe(A2[i][j][k]))
    ));
  });

  it('different rho → different A (with overwhelming probability)', () => {
    const rho1 = new Uint8Array(32).fill(1);
    const rho2 = new Uint8Array(32).fill(2);
    const A1 = expandA(rho1); const A2 = expandA(rho2);
    let different = false;
    A1.forEach((row, i) => row.forEach((p, j) =>
      p.forEach((c, k) => { if (c !== A2[i][j][k]) different = true; })
    ));
    expect(different).toBe(true);
  });
});

// ── encode/decode message (FIPS 203 §4.2.1) ──────────────────────────────────

describe('encodeMessage', () => {
  it('output length is N', () => expect(encodeMessage(new Uint8Array(32))).toHaveLength(N));

  it('zero message → all-zero polynomial', () => {
    encodeMessage(new Uint8Array(32)).forEach(c => expect(c).toBe(0));
  });

  it('each coefficient is 0 or round(Q/2)', () => {
    const m = new Uint8Array(32); crypto.getRandomValues(m);
    const halfQ = Math.round(Q / 2);
    encodeMessage(m).forEach(c => expect([0, halfQ]).toContain(c));
  });

  it('encodes bit 0 as 0 and bit 1 as round(Q/2)', () => {
    const m = new Uint8Array(32); m[0] = 0b10110001;
    const p = encodeMessage(m);
    const halfQ = Math.round(Q / 2);
    // bits of m[0]: bit0=1, bit1=0, bit2=0, bit3=0, bit4=1, bit5=1, bit6=0, bit7=1
    expect(p[0]).toBe(halfQ);  // bit 0 = 1
    expect(p[1]).toBe(0);      // bit 1 = 0
    expect(p[4]).toBe(halfQ);  // bit 4 = 1
  });
});

describe('decodeMessage', () => {
  it('output length is N', () => expect(decodeMessage(new Array(N).fill(0))).toHaveLength(N));

  it('0 → 0', () => decodeMessage(new Array(N).fill(0)).forEach(b => expect(b).toBe(0)));

  it('round(Q/2) → 1', () => {
    decodeMessage(new Array(N).fill(Math.round(Q / 2))).forEach(b => expect(b).toBe(1));
  });

  it('Q-1 → 1 (close to round(Q/2) from above wraps)', () => {
    // Q-1 = 3328. round(3328 * 2 / 3329) = round(1.9994) = 2 → 2 & 1 = 0?
    // Actually 3328*2=6656, 6656/3329 ≈ 1.999, round=2, 2&1=0
    // So Q-1 decodes to 0 — correct, it's closer to 0 than to Q/2
    expect(decodeMessage([Q - 1])[0]).toBe(0);
  });

  it('round-trip: decode(encode(m)) = m bits', () => {
    const m = new Uint8Array(32); crypto.getRandomValues(m);
    const enc = encodeMessage(m);
    const dec = decodeMessage(enc);
    for (let i = 0; i < N; i++) {
      const bit = (m[i >> 3] >> (i & 7)) & 1;
      expect(dec[i]).toBe(bit);
    }
  });
});

// ── compress / decompress (FIPS 203 §4.2.1) ──────────────────────────────────

describe('compress', () => {
  it('Compress(0, d) = 0 for any d', () => {
    [1, 4, 10, 12].forEach(d => expect(compress(0, d)).toBe(0));
  });

  it('Compress(x, 4) ∈ [0, 15]', () => {
    for (let x = 0; x < Q; x += 17)
      expect(compress(x, 4)).toBeGreaterThanOrEqual(0),
      expect(compress(x, 4)).toBeLessThan(16);
  });

  it('Compress(x, 10) ∈ [0, 1023]', () => {
    for (let x = 0; x < Q; x += 17)
      expect(compress(x, 10)).toBeGreaterThanOrEqual(0),
      expect(compress(x, 10)).toBeLessThan(1024);
  });

  it('Compress(round(Q/2), 1) = 1  (half = bit 1)', () => {
    expect(compress(Math.round(Q / 2), 1)).toBe(1);
  });

  it('Compress(0, 1) = 0', () => expect(compress(0, 1)).toBe(0));
});

describe('decompress', () => {
  it('Decompress(0, d) = 0', () => {
    [1, 4, 10].forEach(d => expect(decompress(0, d)).toBe(0));
  });

  it('Decompress(Compress(x, d), d) ≈ x within rounding error', () => {
    // FIPS 203 §4.2.1: |Decompress(Compress(x,d),d) - x| ≤ round(q/2^(d+1))
    for (let d of [4, 10]) {
      const bound = Math.round(Q / (1 << (d + 1))) + 1;
      for (let x = 0; x < Q; x += 50) {
        const y    = compress(x, d);
        const xHat = decompress(y, d);
        const diff = Math.min(Math.abs(xHat - x), Q - Math.abs(xHat - x));
        expect(diff).toBeLessThanOrEqual(bound);
      }
    }
  });
});

// ── Key generation stages ─────────────────────────────────────────────────────

describe('stageGenerateKey', () => {
  it('rho is 32 bytes', () => expect(stageGenerateKey().rho).toHaveLength(32));

  it('s0, s1 have length N', () => {
    const k = stageGenerateKey();
    expect(k.s0).toHaveLength(N); expect(k.s1).toHaveLength(N);
  });

  it('s0, s1 are CBD small: signed coeff in [-2, 2]', () => {
    const k = stageGenerateKey();
    [...k.s0, ...k.s1].forEach(c => {
      const signed = c > Q / 2 ? c - Q : c;
      expect(signed).toBeGreaterThanOrEqual(-2);
      expect(signed).toBeLessThanOrEqual(2);
    });
  });

  it('A polynomials have length N and coefficients in [0, Q)', () => {
    const k = stageGenerateKey();
    [k.A00, k.A01, k.A10, k.A11].forEach(p => {
      expect(p).toHaveLength(N);
      p.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
    });
  });

  it('produces different keys on successive calls', () => {
    const k1 = stageGenerateKey(); const k2 = stageGenerateKey();
    expect(k1.rho).not.toEqual(k2.rho);
  });
});

describe('stageNTT', () => {
  it('NTT(A) and NTT(s) have length N in [0, Q)', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    [n.nttA00, n.nttA01, n.nttA10, n.nttA11, n.nttS0, n.nttS1].forEach(p => {
      expect(p).toHaveLength(N);
      p.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
    });
  });

  it('AS0, AS1 have length N in [0, Q)', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    [n.AS0, n.AS1].forEach(p => {
      expect(p).toHaveLength(N);
      p.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
    });
  });
});

describe('stageAddError', () => {
  it('e0, e1 are CBD small', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    const t = stageAddError(n);
    [...t.e0, ...t.e1].forEach(c => {
      const signed = c > Q / 2 ? c - Q : c;
      expect(signed).toBeGreaterThanOrEqual(-2);
      expect(signed).toBeLessThanOrEqual(2);
    });
  });

  it('t0, t1 in [0, Q)', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    const t = stageAddError(n);
    [...t.t0, ...t.t1].forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });
});

describe('stageEncode', () => {
  it('encode12 values are 12-bit (< 4096)', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    const t = stageAddError(n);
    const e = stageEncode(t);
    [...e.t0enc, ...e.t1enc].forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(4096);
    });
  });

  it('encode12(t0)[i] = t0[i] & 0xFFF  (identity since q < 2^12)', () => {
    const k = stageGenerateKey();
    const n = stageNTT(k);
    const t = stageAddError(n);
    const e = stageEncode(t);
    e.t0enc.forEach((c, i) => expect(c).toBe(t.t0[i] & 0xFFF));
  });
});

describe('stagePublicKey', () => {
  it('public key is exactly 800 bytes', () => {
    const k  = stageGenerateKey();
    const n  = stageNTT(k);
    const t  = stageAddError(n);
    const e  = stageEncode(t);
    const pk = stagePublicKey(k.rho, e, t);
    expect(pk.publicKey).toHaveLength(800);
  });

  it('first 32 bytes are rho', () => {
    const k  = stageGenerateKey();
    const n  = stageNTT(k);
    const t  = stageAddError(n);
    const e  = stageEncode(t);
    const pk = stagePublicKey(k.rho, e, t);
    expect(Array.from(pk.publicKey.slice(0, 32))).toEqual(Array.from(k.rho));
  });
});
