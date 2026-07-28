// Tests pending — encapsulate API refactored to step-by-step stages
import { describe, it, expect } from 'vitest';
import { compress, encodeMessage } from '../crypto/mlkem';
import { N, Q } from '../crypto/types';

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
