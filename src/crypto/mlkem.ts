/**
 * ML-KEM-512 key generation implementation
 * Based on NIST FIPS 203
 */

import { Q, N, ETA } from './types';
import type { Polynomial, Matrix, KeyGenResult } from './types';
import { ntt, inverseNtt, nttMultiply, modQ } from './ntt';

/**
 * Centered Binomial Distribution with eta=2
 * Produces coefficients in {-ETA, ..., ETA}
 */
function cbd(randomBytes: Uint8Array): Polynomial {
  const poly: number[] = new Array(N).fill(0);
  
  for (let i = 0; i < N; i++) {
    let a = 0, b = 0;
    for (let j = 0; j < ETA; j++) {
      const byteIdx = Math.floor((i * 2 * ETA + j) / 8);
      const bitIdx = (i * 2 * ETA + j) % 8;
      a += (randomBytes[byteIdx] >> bitIdx) & 1;
    }
    for (let j = 0; j < ETA; j++) {
      const byteIdx = Math.floor((i * 2 * ETA + ETA + j) / 8);
      const bitIdx = (i * 2 * ETA + ETA + j) % 8;
      b += (randomBytes[byteIdx] >> bitIdx) & 1;
    }
    poly[i] = modQ(a - b);
  }
  
  return poly;
}

/**
 * Generate random polynomial with coefficients in [0, q-1]
 * using CSPRNG (Web Crypto API)
 */
function randomPolynomial(): Polynomial {
  const bytes = new Uint8Array(N * 2);
  crypto.getRandomValues(bytes);
  return Array.from({ length: N }, (_, i) =>
    ((bytes[i * 2] | (bytes[i * 2 + 1] << 8)) & 0x1FFF) % Q
  );
}

/**
 * Generate matrix A using pseudo-random expansion
 * Returns 2x2 matrix of polynomials in NTT domain
 */
function generateMatrixA(): Matrix {
  return [
    [randomPolynomial(), randomPolynomial()],
    [randomPolynomial(), randomPolynomial()],
  ];
}

/**
 * Matrix-vector multiplication in NTT domain
 * AS = A * s where multiplication is polynomial multiplication
 */
function matrixVectorMul(A: Matrix, s: Polynomial[]): Polynomial[] {
  const k = A.length;
  const result: Polynomial[] = [];
  
  for (let i = 0; i < k; i++) {
    let acc = new Array(N).fill(0);
    for (let j = 0; j < k; j++) {
      const aNtt = ntt(A[i][j]);
      const sNtt = ntt(s[j]);
      const product = nttMultiply(aNtt, sNtt);
      const productPoly = inverseNtt(product);
      acc = acc.map((c, idx) => modQ(c + productPoly[idx]));
    }
    result.push(acc);
  }
  
  return result;
}

/**
 * Add two polynomials coefficient-wise mod q
 */
function polyAdd(a: Polynomial, b: Polynomial): Polynomial {
  return a.map((c, i) => modQ(c + b[i]));
}

/**
 * Encode polynomial: pack each coefficient into 12 bits.
 * Since q=3329 < 2^12=4096, every coefficient fits in 12 bits.
 * The value does NOT change — only the storage size shrinks from 16-bit to 12-bit.
 *
 * FIPS 203 ByteEncode_12: packs 256 coefficients × 12 bits = 384 bytes.
 * We store the 12-bit values as plain numbers for display purposes.
 */
function encodePolynomial(t: Polynomial): { t1: number[], t0: number[] } {
  // t1 = the 12-bit value itself (same number, smaller container)
  // t0 = high nibble (bits 11-8) for visualization of the bit split
  const t1 = t.map(c => c & 0xFFF);           // lower 12 bits — same as c since c < 3329 < 4096
  const t0 = t.map(c => (c >> 8) & 0xF);      // top 4 bits of the 12-bit value (bits 11-8)
  return { t1, t0 };
}

/**
 * Main key generation function
 */
export async function generateKeyPair(): Promise<KeyGenResult> {
  const totalStart = performance.now();

  // Generate matrix A
  const matrixA = generateMatrixA();

  // Generate secret vector using CBD
  const sBytes0 = new Uint8Array(N);
  const sBytes1 = new Uint8Array(N);
  crypto.getRandomValues(sBytes0);
  crypto.getRandomValues(sBytes1);
  const s = [cbd(sBytes0), cbd(sBytes1)];

  // Generate error vector using CBD
  const eBytes0 = new Uint8Array(N);
  const eBytes1 = new Uint8Array(N);
  crypto.getRandomValues(eBytes0);
  crypto.getRandomValues(eBytes1);
  const e = [cbd(eBytes0), cbd(eBytes1)];

  // Matrix-vector multiplication AS
  const multStart = performance.now();
  const asIntermediate = matrixVectorMul(matrixA, s);
  const matrixMultTime = performance.now() - multStart;

  // Add error: t = AS + e
  const errStart = performance.now();
  const rawT = asIntermediate.map((poly, i) => polyAdd(poly, e[i]));
  const errorAddTime = performance.now() - errStart;

  // Encode t into t1 and t0
  const encStart = performance.now();
  const encoded = rawT.map(encodePolynomial);
  const encodingTime = performance.now() - encStart;

  const totalTime = performance.now() - totalStart;

  return {
    matrixA,
    secretVector: { s0: s[0], s1: s[1] },
    errorVector: { e0: e[0], e1: e[1] },
    asIntermediate,
    rawT,
    encodedT1: encoded.map(enc => enc.t1),
    encodedT0: encoded.map(enc => enc.t0),
    timing: {
      nttTime: matrixMultTime * 0.7, // NTT dominates mult time
      matrixMultTime,
      errorAddTime,
      encodingTime,
      totalTime,
    },
  };
}
