import { describe, it, expect } from 'vitest';
import { generateKeyPair } from '../crypto/mlkem';
import { encapsulate, buildEncapRows } from '../crypto/encapsulate';
import { encodeMessage } from '../crypto/types';
import { N, Q } from '../crypto/types';

describe('encodeMessage', () => {
  it('produces N coefficients', () => {
    const m = new Uint8Array(32);
    expect(encodeMessage(m)).toHaveLength(N);
  });

  it('zero bytes give all-zero polynomial', () => {
    const m = new Uint8Array(32);
    encodeMessage(m).forEach(c => expect(c).toBe(0));
  });

  it('0xFF bytes give all-1664 polynomial', () => {
    const m = new Uint8Array(32).fill(0xff);
    encodeMessage(m).forEach(c => expect(c).toBe(Math.floor(Q / 2)));
  });

  it('each coefficient is either 0 or floor(q/2)', () => {
    const m = new Uint8Array(32);
    crypto.getRandomValues(m);
    encodeMessage(m).forEach(c => expect([0, Math.floor(Q / 2)]).toContain(c));
  });
});

describe('encapsulate', () => {
  it('returns all required fields', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc).toHaveProperty('r');
    expect(enc).toHaveProperty('e1');
    expect(enc).toHaveProperty('e2');
    expect(enc).toHaveProperty('m');
    expect(enc).toHaveProperty('encM');
    expect(enc).toHaveProperty('nttAT');
    expect(enc).toHaveProperty('nttR');
    expect(enc).toHaveProperty('nttAtR');
    expect(enc).toHaveProperty('atR');
    expect(enc).toHaveProperty('u');
    expect(enc).toHaveProperty('uEnc');
    expect(enc).toHaveProperty('tTR');
    expect(enc).toHaveProperty('v');
    expect(enc).toHaveProperty('vEnc');
  });

  it('m is 32 bytes', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc.m).toHaveLength(32);
  });

  it('u has 2 polynomials of length N in [0, q-1]', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc.u).toHaveLength(2);
    enc.u.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(Q);
      });
    });
  });

  it('v has length N with coefficients in [0, q-1]', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    expect(enc.v).toHaveLength(N);
    enc.v.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('uEnc values are 12-bit (< 4096)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.uEnc.forEach(poly =>
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(4096);
      })
    );
  });

  it('vEnc values are 12-bit (< 4096)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.vEnc.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(4096);
    });
  });

  it('uEnc values equal u values (same number, 12-bit storage)', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    enc.uEnc.forEach((poly, k) =>
      poly.forEach((c, i) => expect(c).toBe(enc.u[k][i] & 0xFFF))
    );
  });
});

describe('buildEncapRows', () => {
  it('builds 256 rows', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    const rows = buildEncapRows(enc);
    expect(rows).toHaveLength(256);
  });

  it('rows have correct index', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    buildEncapRows(enc).forEach((r, i) => expect(r.index).toBe(i));
  });

  it('rows contain correct r0 values', async () => {
    const kg = await generateKeyPair();
    const enc = await encapsulate(kg);
    const rows = buildEncapRows(enc);
    expect(rows[10].r0).toBe(enc.r[0][10]);
    expect(rows[10].v).toBe(enc.v[10]);
    expect(rows[10].vEnc).toBe(enc.vEnc[10]);
  });
});
