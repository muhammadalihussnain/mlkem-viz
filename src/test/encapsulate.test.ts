import { describe, it, expect } from 'vitest';
import { generateKeyPair } from '../crypto/mlkem';
import { encapsulate, buildEncapRows } from '../crypto/encapsulate';
import { encodeMessage, compress } from '../crypto/types';
import { N, Q } from '../crypto/types';

// ── compress ──────────────────────────────────────────────────────────────────

describe('compress', () => {
  it('Compress(0, d) = 0', () => {
    expect(compress(0, 4)).toBe(0);
    expect(compress(0, 10)).toBe(0);
  });

  it('Compress(q, d) wraps to 0', () => {
    expect(compress(Q, 4) & 0xF).toBe(0);
    expect(compress(Q, 10) & 0x3FF).toBe(0);
  });

  it('Compress(x, 10) is in [0, 1023]', () => {
    for (let x = 0; x < Q; x += 100) {
      const c = compress(x, 10);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(1024);
    }
  });

  it('Compress(x, 4) is in [0, 15]', () => {
    for (let x = 0; x < Q; x += 100) {
      const c = compress(x, 4);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(16);
    }
  });

  it('Compress(floor(q/2), 1) = 1', () => {
    expect(compress(Math.floor(Q / 2), 1)).toBe(1);
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

  it('0xFF bytes give all floor(q/2) polynomial', () => {
    new Uint8Array(32).fill(0xff);
    encodeMessage(new Uint8Array(32).fill(0xff)).forEach(c =>
      expect(c).toBe(Math.floor(Q / 2))
    );
  });

  it('each coefficient is either 0 or floor(q/2)', () => {
    const m = new Uint8Array(32);
    crypto.getRandomValues(m);
    encodeMessage(m).forEach(c => expect([0, Math.floor(Q / 2)]).toContain(c));
  });
});

// ── encapsulate ───────────────────────────────────────────────────────────────

describe('encapsulate', () => {
  it('returns all required fields', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    const fields = ['r','e1','e2','m','encM','nttAT','nttR','nttAtR','atR',
                    'u','uEnc','uComp','tTR','v','vEnc','vComp'];
    fields.forEach(f => expect(enc).toHaveProperty(f));
  });

  it('m is 32 bytes', async () => {
    const kg = await generateKeyPair();
    expect((await encapsulate(kg)).m).toHaveLength(32);
  });

  it('u has 2 polynomials of length N in [0, q-1]', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc.u).toHaveLength(2);
    enc.u.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
    });
  });

  it('v has length N with coefficients in [0, q-1]', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc.v).toHaveLength(N);
    enc.v.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(Q); });
  });

  it('uEnc values are 12-bit (< 4096)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.uEnc.forEach(poly => poly.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(4096);
    }));
  });

  it('vEnc values are 12-bit (< 4096)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.vEnc.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(4096); });
  });

  it('uEnc values equal u & 0xFFF', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.uEnc.forEach((poly, k) =>
      poly.forEach((c, i) => expect(c).toBe(enc.u[k][i] & 0xFFF))
    );
  });

  it('uComp is 10-bit [0, 1023] and matches compress(u, 10)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.uComp.forEach((poly, k) =>
      poly.forEach((c, i) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(1024);
        expect(c).toBe(compress(enc.u[k][i], 10));
      })
    );
  });

  it('vComp is 4-bit [0, 15] and matches compress(v, 4)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.vComp.forEach((c, i) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(16);
      expect(c).toBe(compress(enc.v[i], 4));
    });
  });
});

// ── buildEncapRows ────────────────────────────────────────────────────────────

describe('buildEncapRows', () => {
  it('builds 256 rows', async () => {
    const kg = await generateKeyPair();
    expect(buildEncapRows(await encapsulate(kg))).toHaveLength(256);
  });

  it('rows have correct index', async () => {
    const kg = await generateKeyPair();
    buildEncapRows(await encapsulate(kg)).forEach((r, i) => expect(r.index).toBe(i));
  });

  it('rows contain correct r0, v, vComp, uComp0, uComp1 values', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    const rows = buildEncapRows(enc);
    expect(rows[10].r0).toBe(enc.r[0][10]);
    expect(rows[10].v).toBe(enc.v[10]);
    expect(rows[10].vEnc).toBe(enc.vEnc[10]);
    expect(rows[10].vComp).toBe(enc.vComp[10]);
    expect(rows[10].uComp0).toBe(enc.uComp[0][10]);
    expect(rows[10].uComp1).toBe(enc.uComp[1][10]);
  });
});
