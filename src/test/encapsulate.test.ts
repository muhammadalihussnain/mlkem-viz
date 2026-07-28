import { describe, it, expect, vi } from 'vitest';
import { compress, encodeMessage, expandA } from '../crypto/mlkem';
import { N, Q } from '../crypto/types';
import {
  stageBobGenerateA,
  stageBobComputeUV,
  stageBobCompress,
  stageAliceSTU,
  stageAliceDecap,
  stageCompare,
} from '../crypto/encapsulate';

// ── compress ──────────────────────────────────────────────────────────────────

describe('compress', () => {
  it('Compress(0, d) = 0', () => {
    expect(compress(0, 4)).toBe(0);
    expect(compress(0, 10)).toBe(0);
  });
  it('Compress(x, 4) is in [0, 15]', () => {
    for (let x = 0; x < Q; x += 100) {
      const c = compress(x, 4);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(16);
    }
  });
  it('Compress(x, 10) is in [0, 1023]', () => {
    for (let x = 0; x < Q; x += 100) {
      const c = compress(x, 10);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(1024);
    }
  });
});

// ── encodeMessage ─────────────────────────────────────────────────────────────

describe('encodeMessage', () => {
  it('produces N coefficients', () => {
    expect(encodeMessage(new Uint8Array(32))).toHaveLength(N);
  });
  it('zero bytes give all-zero polynomial', () => {
    encodeMessage(new Uint8Array(32)).forEach(c => expect(c).toBe(0));
  });
  it('0xFF bytes give all round(q/2) = 1665 (FIPS 203 uses round, not floor)', () => {
    encodeMessage(new Uint8Array(32).fill(0xff)).forEach(c =>
      expect(c).toBe(Math.round(Q / 2))
    );
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

function zeroPoly(): number[] {
  return new Array(N).fill(0);
}

// ── full pipeline integration test ───────────────────────────────────────────

describe('encapsulate/decapsulate pipeline', () => {
  it('stageCompare: identical bits → 0 errors', () => {
    const m = new Uint8Array(32).fill(0xAB);
    const bits = Array.from(m).flatMap(b =>
      Array.from({ length: 8 }, (_, i) => (b >> i) & 1)
    );
    const result = stageCompare(m, bits);
    expect(result.errCount).toBe(0);
    expect(result.bobBits).toHaveLength(256);
    expect(result.aliceBits).toHaveLength(256);
  });

  it('stageCompare: all-different bits → 256 errors', () => {
    const m = new Uint8Array(32).fill(0x00);
    const allOnes = new Array(256).fill(1);
    const result = stageCompare(m, allOnes);
    expect(result.errCount).toBe(256);
  });

  it('stageCompare: partial mismatch counts correctly', () => {
    const m = new Uint8Array(32).fill(0x00);
    const recovered = new Array(256).fill(0);
    recovered[0] = 1; // flip 1 bit
    const result = stageCompare(m, recovered);
    expect(result.errCount).toBe(1);
  });
});

// ── stageBobCompress ──────────────────────────────────────────────────────────

describe('stageBobCompress', () => {
  it('compresses U and V into expected ranges', () => {
    const mockUV = {
      m: new Uint8Array(32),
      encM: zeroPoly(),
      r0: zeroPoly(), r1: zeroPoly(),
      e1_0: zeroPoly(), e1_1: zeroPoly(),
      e2: zeroPoly(),
      nttR0: zeroPoly(), nttR1: zeroPoly(),
      AtR0: zeroPoly(), AtR1: zeroPoly(),
      U0: zeroPoly(), U1: zeroPoly(),
      tTr: zeroPoly(),
      V: zeroPoly(),
    };

    const result = stageBobCompress(mockUV);
    expect(result.U0c).toHaveLength(N);
    expect(result.U1c).toHaveLength(N);
    expect(result.Vc).toHaveLength(N);
    result.U0c.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(1024); });
    result.U1c.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(1024); });
    result.Vc.forEach(c =>  { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(16); });
  });
});

// ── stageAliceDecap ───────────────────────────────────────────────────────────

describe('stageAliceDecap', () => {
  it('w = V - sTU, recovers bits 0 or 1', () => {
    const encM = encodeMessage(new Uint8Array(32).fill(0xA5));
    const sTU  = zeroPoly();
    const V    = [...encM]; // no noise

    const mockUV = {
      m: new Uint8Array(32).fill(0xA5),
      encM,
      r0: zeroPoly(), r1: zeroPoly(),
      e1_0: zeroPoly(), e1_1: zeroPoly(),
      e2: zeroPoly(),
      nttR0: zeroPoly(), nttR1: zeroPoly(),
      AtR0: zeroPoly(), AtR1: zeroPoly(),
      U0: zeroPoly(), U1: zeroPoly(),
      tTr: zeroPoly(),
      V,
    };
    const mockSTU = { nttU0: zeroPoly(), nttU1: zeroPoly(), sTU };

    const result = stageAliceDecap(mockUV, mockSTU);
    expect(result.w).toHaveLength(N);
    expect(result.recovered).toHaveLength(N);
    result.recovered.forEach(b => expect([0, 1]).toContain(b));
    expect(result.recoveredBytes).toHaveLength(32);
  });

  it('recoveredBytes repacks recovered bits correctly', () => {
    const m = new Uint8Array(32).fill(0x01); // 0b00000001
    const encM = encodeMessage(m);
    const V = [...encM];
    const mockUV = {
      m,
      encM,
      r0: zeroPoly(), r1: zeroPoly(),
      e1_0: zeroPoly(), e1_1: zeroPoly(),
      e2: zeroPoly(),
      nttR0: zeroPoly(), nttR1: zeroPoly(),
      AtR0: zeroPoly(), AtR1: zeroPoly(),
      U0: zeroPoly(), U1: zeroPoly(),
      tTr: zeroPoly(),
      V,
    };
    const mockSTU = { nttU0: zeroPoly(), nttU1: zeroPoly(), sTU: zeroPoly() };
    const result = stageAliceDecap(mockUV, mockSTU);
    // recovered bits packed → should match original m
    expect(result.recoveredBytes[0]).toBe(0x01);
  });
});

// ── stageAliceSTU ─────────────────────────────────────────────────────────────

describe('stageAliceSTU', () => {
  it('returns correct shape with zero inputs', () => {
    const mockAliceKey = {
      rho: new Uint8Array(32),
      s0: zeroPoly(), s1: zeroPoly(),
      A00: zeroPoly(), A01: zeroPoly(),
      A10: zeroPoly(), A11: zeroPoly(),
    };
    const mockNttStage = {
      nttA00: zeroPoly(), nttA01: zeroPoly(),
      nttA10: zeroPoly(), nttA11: zeroPoly(),
      nttS0: zeroPoly(), nttS1: zeroPoly(),
      AS0: zeroPoly(), AS1: zeroPoly(),
    };
    const mockUV = {
      m: new Uint8Array(32),
      encM: zeroPoly(),
      r0: zeroPoly(), r1: zeroPoly(),
      e1_0: zeroPoly(), e1_1: zeroPoly(),
      e2: zeroPoly(),
      nttR0: zeroPoly(), nttR1: zeroPoly(),
      AtR0: zeroPoly(), AtR1: zeroPoly(),
      U0: zeroPoly(), U1: zeroPoly(),
      tTr: zeroPoly(),
      V: zeroPoly(),
    };

    const result = stageAliceSTU(mockAliceKey, mockNttStage, mockUV);
    expect(result.nttU0).toHaveLength(N);
    expect(result.nttU1).toHaveLength(N);
    expect(result.sTU).toHaveLength(N);
  });
});

// ── stageBobGenerateA ─────────────────────────────────────────────────────────

describe('stageBobGenerateA', () => {
  it('derives A from rho and detects match', () => {
    const rho = new Uint8Array(32).fill(0x42);
    const A = expandA(rho);

    const pk = { publicKey: new Uint8Array(800) };
    pk.publicKey.set(rho, 0);

    const aliceKey = {
      rho,
      s0: zeroPoly(), s1: zeroPoly(),
      A00: A[0][0], A01: A[0][1],
      A10: A[1][0], A11: A[1][1],
    };

    const result = stageBobGenerateA(pk, aliceKey);
    expect(result.aMatch).toBe(true);
    expect(result.bobA00).toHaveLength(N);
    expect(result.bobA01).toHaveLength(N);
    expect(result.bobA10).toHaveLength(N);
    expect(result.bobA11).toHaveLength(N);
  });

  it('detects A mismatch when aliceKey has different A', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rho = new Uint8Array(32).fill(0x42);
    const pk = { publicKey: new Uint8Array(800) };
    pk.publicKey.set(rho, 0);

    const aliceKey = {
      rho,
      s0: zeroPoly(), s1: zeroPoly(),
      A00: new Array(N).fill(1), // wrong A
      A01: zeroPoly(),
      A10: zeroPoly(),
      A11: zeroPoly(),
    };

    const result = stageBobGenerateA(pk, aliceKey);
    expect(result.aMatch).toBe(false);
    warnSpy.mockRestore();
  });
});

// ── stageBobComputeUV ─────────────────────────────────────────────────────────

describe('stageBobComputeUV', () => {
  it('produces correct shape output', () => {
    const rho = new Uint8Array(32).fill(0x11);
    const A = expandA(rho);

    const tStage = {
      e0: zeroPoly(), e1: zeroPoly(),
      t0: zeroPoly(), t1: zeroPoly(),
    };
    const nttStage = {
      nttA00: zeroPoly(), nttA01: zeroPoly(),
      nttA10: zeroPoly(), nttA11: zeroPoly(),
      nttS0: zeroPoly(), nttS1: zeroPoly(),
      AS0: zeroPoly(), AS1: zeroPoly(),
    };
    const bobA = {
      bobA00: A[0][0], bobA01: A[0][1],
      bobA10: A[1][0], bobA11: A[1][1],
      aMatch: true,
    };

    const result = stageBobComputeUV(tStage, nttStage, bobA);

    expect(result.m).toHaveLength(32);
    expect(result.encM).toHaveLength(N);
    expect(result.U0).toHaveLength(N);
    expect(result.U1).toHaveLength(N);
    expect(result.V).toHaveLength(N);
    expect(result.nttR0).toHaveLength(N);
    expect(result.nttR1).toHaveLength(N);
  });
});
