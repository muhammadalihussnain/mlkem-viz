import { describe, it, expect } from 'vitest';
import { generateKeyPair } from '../crypto/mlkem';
import { Q, N } from '../crypto/types';

describe('generateKeyPair', () => {
  it('returns a result with all required fields', async () => {
    const result = await generateKeyPair();
    expect(result).toHaveProperty('matrixA');
    expect(result).toHaveProperty('nttA');
    expect(result).toHaveProperty('secretVector');
    expect(result).toHaveProperty('nttS');
    expect(result).toHaveProperty('errorVector');
    expect(result).toHaveProperty('asIntermediate');
    expect(result).toHaveProperty('nttProduct');
    expect(result).toHaveProperty('rawT');
    expect(result).toHaveProperty('encodedT1');
    expect(result).toHaveProperty('encodedT0');
    expect(result).toHaveProperty('timing');
  });

  it('matrix A is 2x2 with polynomials of length N', async () => {
    const result = await generateKeyPair();
    expect(result.matrixA).toHaveLength(2);
    result.matrixA.forEach(row => row.forEach(poly => expect(poly).toHaveLength(N)));
  });

  it('matrix A coefficients are in [0, q-1]', async () => {
    const result = await generateKeyPair();
    result.matrixA.forEach(row =>
      row.forEach(poly =>
        poly.forEach(c => {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(Q);
        })
      )
    );
  });

  it('nttA is a 2x2 matrix of NTT-domain polynomials in [0, q-1]', async () => {
    const result = await generateKeyPair();
    expect(result.nttA).toHaveLength(2);
    result.nttA.forEach(row =>
      row.forEach(poly => {
        expect(poly).toHaveLength(N);
        poly.forEach(c => {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(Q);
        });
      })
    );
  });

  it('nttS has 2 polynomials of length N in [0, q-1]', async () => {
    const result = await generateKeyPair();
    expect(result.nttS).toHaveLength(2);
    result.nttS.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(Q);
      });
    });
  });

  it('nttProduct has 2 pointwise-product polynomials in [0, q-1]', async () => {
    const result = await generateKeyPair();
    expect(result.nttProduct).toHaveLength(2);
    result.nttProduct.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(Q);
      });
    });
  });

  it('secret vector has small CBD coefficients in [0, q-1]', async () => {
    const result = await generateKeyPair();
    [...result.secretVector.s0, ...result.secretVector.s1].forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('error vector has small CBD coefficients in [0, q-1]', async () => {
    const result = await generateKeyPair();
    [...result.errorVector.e0, ...result.errorVector.e1].forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(Q);
    });
  });

  it('AS intermediate has 2 polynomials of length N in [0, q-1]', async () => {
    const result = await generateKeyPair();
    expect(result.asIntermediate).toHaveLength(2);
    result.asIntermediate.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(Q);
      });
    });
  });

  it('rawT (AS+e) has 2 polynomials in [0, q-1]', async () => {
    const result = await generateKeyPair();
    expect(result.rawT).toHaveLength(2);
    result.rawT.forEach(poly => {
      expect(poly).toHaveLength(N);
      poly.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(Q);
      });
    });
  });

  it('encodedT1 values equal rawT — same number, 12-bit storage (q < 2^12)', async () => {
    const result = await generateKeyPair();
    result.encodedT1.forEach((poly, k) =>
      poly.forEach((c, i) => {
        expect(c).toBe(result.rawT[k][i] & 0xFFF);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(4096);
      })
    );
  });

  it('timing fields are non-negative', async () => {
    const result = await generateKeyPair();
    expect(result.timing.totalTime).toBeGreaterThan(0);
    expect(result.timing.matrixMultTime).toBeGreaterThanOrEqual(0);
    expect(result.timing.errorAddTime).toBeGreaterThanOrEqual(0);
    expect(result.timing.encodingTime).toBeGreaterThanOrEqual(0);
  });

  it('generates different keys on each call', async () => {
    const r1 = await generateKeyPair();
    const r2 = await generateKeyPair();
    expect(r1.matrixA[0][0][0]).not.toBe(r2.matrixA[0][0][0]);
  });
});
