/**
 * InfoSection — explains what this app does, why it was built,
 * and what each step computes (with sizes).
 */

import { useState } from 'react';
import { KeyGenFlowDiagram } from './KeyGenFlowDiagram.tsx';

export function InfoSection() {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">

      {/* ── Toggle header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 text-left border-b border-gray-200"
      >
        <div>
          <span className="text-lg font-bold text-gray-900">About this Demo</span>
          <span className="ml-3 text-sm text-gray-500">What is ML-KEM-512, why this app, and what each step does</span>
        </div>
        <span className="text-gray-400 text-sm font-mono">{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <div className="px-6 py-5 space-y-8 bg-white">

          {/* ── What is this? ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">What is this application?</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              This is a step-by-step interactive visualizer for <strong>ML-KEM-512</strong> (Module Lattice-based Key Encapsulation Mechanism),
              the post-quantum key encapsulation algorithm standardized by NIST in <strong>FIPS 203 (2024)</strong>.
              ML-KEM-512 is designed to be secure against attacks from both classical and quantum computers.
              It replaces RSA and ECDH for key exchange in a post-quantum world.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-2">
              Every computation — from random polynomial generation to NTT transforms to ciphertext compression — is
              executed in your browser. No data leaves your machine. All 256-coefficient polynomials are shown
              in full as a scrollable table with their exact 16-bit binary representations.
            </p>
          </div>

          {/* ── Why was this built? ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">Why was this built?</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              The mathematics of lattice-based cryptography is difficult to explain on a whiteboard.
              Numbers like <em>q = 3329</em>, polynomial rings, NTT butterflies, and compression errors
              become abstract very quickly. This tool was built to show the team that these calculations
              are <strong>real, concrete, and verifiable</strong> — you can see every coefficient, trace
              every transformation, and confirm that Alice and Bob end up with the same shared secret
              despite never exchanging it directly.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-2">
              The goal is not to replace reading FIPS 203, but to make it tangible enough that an engineer
              can point at a specific column and say: <em>"this is where the error is added"</em> or
              <em>"this is what gets compressed to 4 bits"</em>.
            </p>
          </div>

          {/* ── How to use it ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">How to use this application</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Press the numbered buttons in order. Each button triggers a computation and adds new columns
              to the table on the right. Alice's steps are numbered 1–5 for key generation, then 6–8
              for decapsulation. Bob's steps are numbered 1–4. The full flow is:
            </p>
            <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
              <span className="font-mono text-blue-600 font-bold shrink-0">Alice 1–5</span>
              <span>→ Key generation → Public key sent to Bob</span>
            </div>
            <div className="mt-1 flex items-start gap-2 text-sm text-gray-600">
              <span className="font-mono text-orange-600 font-bold shrink-0">Bob 1–4</span>
              <span>→ Encapsulation → Ciphertext sent back to Alice</span>
            </div>
            <div className="mt-1 flex items-start gap-2 text-sm text-gray-600">
              <span className="font-mono text-green-600 font-bold shrink-0">Alice 6–8</span>
              <span>→ Decapsulation → Recover shared secret → Compare with Bob's secret</span>
            </div>
          </div>

          {/* ── Step-by-step breakdown ── */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Step-by-step breakdown</h2>
            <div className="space-y-3">
              <StepCard
                who="Alice"
                n="1"
                label="Generate Key — s and A"
                color="blue"
                what="Alice samples two secret polynomials s[0] and s[1] using the Centered Binomial Distribution (CBD, η=2). Each coefficient is a small integer in {−2, −1, 0, 1, 2}. She also generates the 2×2 public matrix A deterministically from a 32-byte seed ρ."
                why="The small secret s is the lattice trapdoor. A is the public matrix used in both encryption and decryption. Using CBD instead of uniform random keeps the coefficients small enough that errors stay correctable."
                sizes={[
                  { label: 's[0], s[1]', value: '2 × 512B = 1024B  (256 coefficients × 16-bit each)' },
                  { label: 'A[0][0]…A[1][1]', value: '4 × 512B = 2048B' },
                  { label: 'ρ (seed)', value: '32B' },
                ]}
              />

              {/* ── Key Generation Flow Diagram ── */}
              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-blue-600 px-4 py-2">
                  <span className="text-white text-sm font-bold">Key Generation Flow  —  FIPS 203 Algorithm 13 (ML-KEM.KeyGen)</span>
                  <span className="text-blue-200 text-xs ml-3">Complete pipeline from OS randomness → public key</span>
                </div>
                <div className="bg-white">
                  <KeyGenFlowDiagram />
                </div>
              </div>              <StepCard
                who="Alice"
                n="2"
                label="NTT → Compute AS"
                color="blue"
                what="Alice applies the Number Theoretic Transform (NTT) to all four polynomials of A and both secret polynomials. She then computes the matrix-vector product AS in the NTT domain (pointwise multiply + accumulate), then applies INTT to get AS back in normal form."
                why="NTT turns polynomial multiplication from O(n²) to O(n log n). Working in the NTT domain means multiplications become simple pointwise products. This is the efficiency core of ML-KEM — all key crypto operations happen here."
                sizes={[
                  { label: 'NTT(A[i][j]), NTT(s[k])', value: '6 × 512B = 3072B in NTT domain' },
                  { label: 'AS[0], AS[1]', value: '2 × 512B = 1024B  (after INTT)' },
                ]}
              />
              <NttExampleBox />
              <StepCard
                who="Alice"
                n="3"
                label="Add Error — t = AS + e"
                color="blue"
                what="Alice samples two small error polynomials e[0] and e[1] (also CBD, η=2) and adds them to AS coefficient-wise. The result t = AS + e is Alice's raw public key material."
                why="Adding a small error is the core of lattice hardness. Without e, recovering s from (A, t=AS) would be a linear algebra problem. With e, it becomes the Module Learning With Errors (MLWE) problem — believed to be hard even for quantum computers."
                sizes={[
                  { label: 'e[0], e[1]', value: 'small CBD noise, 2 × 512B' },
                  { label: 't[0] = AS[0]+e[0],  t[1]', value: '2 × 512B = 1024B  (16-bit coefficients in [0, q))' },
                ]}
              />
              <StepCard
                who="Alice"
                n="4"
                label="Compress t → encode₁₂"
                color="blue"
                what="Each coefficient of t is in [0, 3328]. Since q = 3329 < 2¹², every value fits in 12 bits. Alice packs 256 coefficients × 12 bits = 384 bytes per polynomial, instead of 512 bytes using 16-bit storage."
                why="This compression step reduces public key size. The 12-bit encoding is lossless for ML-KEM-512 because q < 4096. For ciphertext elements, lossy compression (10-bit and 4-bit) is used later, deliberately introducing small errors that remain correctable."
                sizes={[
                  { label: 'encode₁₂(t[0])', value: '384B  (saved 128B vs 16-bit)' },
                  { label: 'encode₁₂(t[1])', value: '384B' },
                ]}
              />
              <StepCard
                who="Alice"
                n="5"
                label="Generate Public Key — 800B"
                color="blue"
                what="Alice concatenates ρ (32B) ‖ encode₁₂(t[0]) (384B) ‖ encode₁₂(t[1]) (384B) to form the 800-byte public key. This is the only thing sent to Bob."
                why="The public key contains everything Bob needs: ρ to regenerate the same matrix A, and t to compute the ciphertext. Alice's secret s never leaves her side."
                sizes={[
                  { label: 'pk = ρ ‖ enc(t[0]) ‖ enc(t[1])', value: '32 + 384 + 384 = 800B' },
                ]}
              />

              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Bob receives pk, generates ciphertext</p>
              </div>

              <StepCard
                who="Bob"
                n="1"
                label="Generate Bob A — from ρ in pk"
                color="orange"
                what="Bob extracts the 32-byte ρ from the first bytes of Alice's public key, then runs the same deterministic XOF (hash-based expansion) to regenerate matrix A. He also runs Compare A to verify his A matches Alice's A exactly."
                why="The security of ML-KEM relies on A being generated from a public seed ρ, not sent in full. Both parties derive the same A from ρ independently. If they don't match, the protocol has been tampered with."
                sizes={[
                  { label: 'ρ extracted from pk', value: '32B' },
                  { label: 'Bob A[i][j]', value: '4 × 512B = 2048B  (same as Alice)' },
                ]}
              />
              <StepCard
                who="Bob"
                n="2 & 3"
                label="Compute U and V — Encapsulation"
                color="orange"
                what="Bob generates a fresh 256-bit random secret m, encodes it as a polynomial (bit 1 → 1665, bit 0 → 0). He also samples small random r and error polynomials e1, e2. Then: U = Aᵀr + e1 (the ciphertext vector), V = tᵀr + e2 + encode(m) (the ciphertext scalar containing the hidden secret)."
                why="U and V together encrypt m under Alice's public key. Only someone who knows s can reverse V − sᵀU ≈ encode(m). The errors e1 and e2 hide the structure of r, and the MLWE problem ensures no efficient algorithm can extract m without s."
                sizes={[
                  { label: 'm  (Bob\'s random secret)', value: '32B  (256 bits)' },
                  { label: 'encode(m)', value: '512B  (each bit → 0 or 1665, 16-bit)' },
                  { label: 'U[0], U[1]', value: '2 × 512B = 1024B  (16-bit)' },
                  { label: 'V', value: '512B  (16-bit)' },
                ]}
              />
              <StepCard
                who="Bob"
                n="4"
                label="Compress Ciphertext — 768B total"
                color="orange"
                what="Bob compresses U using 10-bit precision (Compress(U, 10)) and V using 4-bit precision (Compress(V, 4)). This deliberately loses some information, which is acceptable because the decode step at Alice's side tolerates small errors."
                why="The 768-byte ciphertext is the final transmission to Alice. Compression reduces bandwidth: uncompressed (U, V) would be 1024 + 512 = 1536B. The 10-bit and 4-bit precisions are chosen so the rounding error stays within the correction radius of decode."
                sizes={[
                  { label: 'Compress(U[0], 10)', value: '320B  (10-bit × 256)' },
                  { label: 'Compress(U[1], 10)', value: '320B' },
                  { label: 'Compress(V, 4)', value: '128B  (4-bit × 256)' },
                  { label: 'Total ciphertext c', value: '320 + 320 + 128 = 768B' },
                ]}
              />

              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Alice receives ciphertext, recovers shared secret</p>
              </div>

              <StepCard
                who="Alice"
                n="6"
                label="Compute s^T u"
                color="green"
                what="Alice computes sᵀU = s[0]·U[0] + s[1]·U[1] in the NTT domain. She applies NTT to both received U polynomials, multiplies pointwise with her stored NTT(s), accumulates, then applies INTT."
                why="This is the decryption step. Mathematically: sᵀU = sᵀ(Aᵀr + e1) = (As)ᵀr + sᵀe1 ≈ tᵀr (since t = As + e_small, and all errors are small). So V − sᵀU ≈ encode(m) + small noise."
                sizes={[
                  { label: 's^T u', value: '512B  (256 coefficients × 16-bit)' },
                ]}
              />
              <StepCard
                who="Alice"
                n="7"
                label="v − s^Tu → decode(m)"
                color="green"
                what="Alice subtracts sᵀU from V to get w = V − sᵀU ≈ encode(m) + noise. She then applies decode: each coefficient is rounded to the nearest bit threshold — if close to q/2 it decodes to 1, if close to 0 it decodes to 0. The table now shows w alongside encode(m) (Bob's original encoded secret) so you can see how close they are before decoding."
                why="Decode is the final error correction. As long as the noise is smaller than q/4 ≈ 832 per coefficient, the rounding succeeds. The small errors from e1, e2 and compression rounding all stay within this bound."
                sizes={[
                  { label: 'w = V − s^Tu', value: '512B' },
                  { label: 'encode(m)', value: "512B  (Bob's secret: 0 or 1664 per coefficient)" },
                  { label: 'decoded bits', value: '256 bits = 32B  (recovered m)' },
                ]}
              />
              <StepCard
                who="Alice"
                n="8"
                label="Compare Secrets"
                color="green"
                what="The final step compares Bob's original m (32 bytes) with Alice's recovered m byte-by-byte and bit-by-bit. Both are shown in hex side-by-side. A strip of 256 coloured bits shows exactly where matches and mismatches occur."
                why="If decapsulation is correct, both should be identical — 0 bit errors. This confirms that a 256-bit shared secret has been securely established between Alice and Bob without ever transmitting the secret itself. The shared secret can then be used as input to a KDF to derive symmetric encryption keys."
                sizes={[
                  { label: 'Bob\'s m', value: '32B  (never transmitted — embedded in ciphertext V)' },
                  { label: 'Alice\'s recovered m', value: '32B  (extracted via decode(V − s^Tu))' },
                  { label: 'Shared secret (on success)', value: '256 bits = 32B' },
                ]}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}


// ── NttExampleBox sub-component ──────────────────────────────────────────────
//
// We multiply the same two polynomials f and g in TWO ways:
//   1. Naive schoolbook  — O(n²), every pair of coefficients
//   2. NTT way           — O(n log n), transform → pointwise → inverse
// Both arrive at the exact same answer. That's the whole point.
//
// Polynomials (4 coefficients, ring ℤ₃₃₂₉[x]/(x⁴+1)):
//   f = 3 + 1x + 4x² + 1x³
//   g = 2 + 7x + 1x² + 8x³
//
// All numbers verified with exact arithmetic mod 3329.
// Result: h = [3316, 3319, 10, 55]  (both methods)

function NttExampleBox() {
  const [showNaive, setShowNaive] = useState(false);
  const [showNtt, setShowNtt] = useState(false);

  // Pre-computed naive per-coefficient breakdown
  // c[k] = sum f[i]*g[k-i]  (direct)  -  sum f[i]*g[k-i+4]  (wrap, x^4=-1)
  const naiveCoeffs = [
    {
      k: 0,
      direct: [{ fi: 'f\u2080=3', gj: 'g\u2080=2', prod: '6' }],
      wrapped: [
        { fi: 'f\u2081=1', gj: 'g\u2083=8', prod: '8' },
        { fi: 'f\u2082=4', gj: 'g\u2082=1', prod: '4' },
        { fi: 'f\u2083=1', gj: 'g\u2081=7', prod: '7' },
      ],
      sum: '6 \u2212 8 \u2212 4 \u2212 7 = \u221213',
      result: 3316,
    },
    {
      k: 1,
      direct: [
        { fi: 'f\u2080=3', gj: 'g\u2081=7', prod: '21' },
        { fi: 'f\u2081=1', gj: 'g\u2080=2', prod: '2' },
      ],
      wrapped: [
        { fi: 'f\u2082=4', gj: 'g\u2083=8', prod: '32' },
        { fi: 'f\u2083=1', gj: 'g\u2082=1', prod: '1' },
      ],
      sum: '21 + 2 \u2212 32 \u2212 1 = \u221210',
      result: 3319,
    },
    {
      k: 2,
      direct: [
        { fi: 'f\u2080=3', gj: 'g\u2082=1', prod: '3' },
        { fi: 'f\u2081=1', gj: 'g\u2081=7', prod: '7' },
        { fi: 'f\u2082=4', gj: 'g\u2080=2', prod: '8' },
      ],
      wrapped: [{ fi: 'f\u2083=1', gj: 'g\u2083=8', prod: '8' }],
      sum: '3 + 7 + 8 \u2212 8 = 10',
      result: 10,
    },
    {
      k: 3,
      direct: [
        { fi: 'f\u2080=3', gj: 'g\u2083=8', prod: '24' },
        { fi: 'f\u2081=1', gj: 'g\u2082=1', prod: '1' },
        { fi: 'f\u2082=4', gj: 'g\u2081=7', prod: '28' },
        { fi: 'f\u2083=1', gj: 'g\u2080=2', prod: '2' },
      ],
      wrapped: [],
      sum: '24 + 1 + 28 + 2 = 55',
      result: 55,
    },
  ];

  // Pre-computed NTT values
  // w8 = 749  (primitive 8th root of unity mod 3329, i.e. 17^416 mod 3329)
  // NTT[k] = sum_j f[j] * w8^(j*(2k+1))  mod 3329
  const nttF = [
    { k: 0, formula: '3\u00b71 + 1\u00b7749 + 4\u00b71729 + 1\u00b740', result: 1050 },
    { k: 1, formula: '3\u00b71 + 1\u00b740 + 4\u00b71600 + 1\u00b7749', result: 534 },
    { k: 2, formula: '3\u00b71 + 1\u00b72580 + 4\u00b71729 + 1\u00b73289', result: 2801 },
    { k: 3, formula: '3\u00b71 + 1\u00b73289 + 4\u00b71600 + 1\u00b72580', result: 2285 },
  ];
  const nttG = [
    { k: 0, formula: '2\u00b71 + 7\u00b7749 + 1\u00b71729 + 8\u00b740', result: 636 },
    { k: 1, formula: '2\u00b71 + 7\u00b740 + 1\u00b71600 + 8\u00b7749', result: 1216 },
    { k: 2, formula: '2\u00b71 + 7\u00b72580 + 1\u00b71729 + 8\u00b73289', result: 2826 },
    { k: 3, formula: '2\u00b71 + 7\u00b73289 + 1\u00b71600 + 8\u00b72580', result: 1988 },
  ];
  const pointwise = [
    { k: 0, a: 1050, b: 636, raw: '667800', result: 2000 },
    { k: 1, a: 534, b: 1216, raw: '649344', result: 189 },
    { k: 2, a: 2801, b: 2826, raw: '7915626', result: 2593 },
    { k: 3, a: 2285, b: 1988, raw: '4542580', result: 1824 },
  ];
  const inttSteps = [
    { j: 0, raw: '3277 \u00b7 2497', result: 3316 },
    { j: 1, raw: '3289 \u00b7 2497', result: 3319 },
    { j: 2, raw: '40 \u00b7 2497', result: 10 },
    { j: 3, raw: '220 \u00b7 2497', result: 55 },
  ];

  const finalResult = [3316, 3319, 10, 55];

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden mt-1">

      {/* header */}
      <div className="bg-blue-600 px-4 py-2 flex items-center gap-3">
        <span className="text-white text-sm font-bold">Polynomial Multiplication: Naive vs NTT</span>
        <span className="text-blue-200 text-xs">same inputs, same answer, very different cost</span>
      </div>

      <div className="px-4 py-4 space-y-4 bg-white">

        {/* The two polynomials */}
        <div>
          <p className="text-xs text-gray-700 leading-relaxed mb-3">
            We want to compute <span className="font-mono font-bold text-blue-700">f &middot; g</span> in the ring{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">&#x2124;&#x2083;&#x2083;&#x2082;&#x2089;[x] / (x&#x2074;+1)</span>.
            Any power x&#x2074; or higher wraps back using <span className="font-mono bg-gray-100 px-1 rounded">x&#x2074; &#x2261; &#x2212;1</span>.
            We use 4 coefficients here so every step is visible &mdash; ML-KEM-512 uses 256.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="font-mono text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2">
              <span className="text-blue-700 font-bold">f</span>
              <span className="text-gray-600 ml-2">= 3 + 1x + 4x&#xB2; + 1x&#xB3;</span>
              <div className="text-[10px] text-blue-500 mt-1">coefficients: [3, 1, 4, 1]</div>
            </div>
            <div className="font-mono text-xs bg-orange-50 border border-orange-200 rounded px-3 py-2">
              <span className="text-orange-600 font-bold">g</span>
              <span className="text-gray-600 ml-2">= 2 + 7x + 1x&#xB2; + 8x&#xB3;</span>
              <div className="text-[10px] text-orange-500 mt-1">coefficients: [2, 7, 1, 8]</div>
            </div>
          </div>
          <div className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-600">
            <span className="font-bold text-gray-800">f &middot; g =</span>
            {'  '}3316 + 3319x + 10x&#xB2; + 55x&#xB3;
            <span className="ml-2 text-gray-400">(both methods below must reach this)</span>
          </div>
        </div>

        {/* Cost comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-0.5">Naive schoolbook</div>
            <div className="font-mono text-sm font-bold text-red-700">n &times; n multiplications</div>
            <div className="text-[10px] text-red-500 mt-1">n=4 &#x2192; <strong>16 muls</strong></div>
            <div className="text-[10px] text-red-400 mt-0.5">n=256 &#x2192; <strong>65,536 muls</strong></div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-0.5">NTT way</div>
            <div className="font-mono text-sm font-bold text-green-700">n &times; log&#x2082;(n) multiplications</div>
            <div className="text-[10px] text-green-600 mt-1">n=4 &#x2192; <strong>8 muls</strong></div>
            <div className="text-[10px] text-green-500 mt-0.5">n=256 &#x2192; <strong>2,048 muls</strong></div>
          </div>
        </div>

        {/* METHOD 1: Naive */}
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowNaive(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-red-50 hover:bg-red-100 text-left"
          >
            <span className="text-xs font-bold text-red-700">
              Method 1 &mdash; Naive schoolbook &nbsp;&middot;&nbsp; O(n&#xB2;)
            </span>
            <span className="text-[10px] font-mono text-red-400">{showNaive ? '\u25b2 hide' : '\u25bc show steps'}</span>
          </button>

          {showNaive && (
            <div className="px-3 py-3 space-y-3">
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Each output coefficient c[k] is a sum of products. When a product&apos;s degree
                hits x&#x2074; or higher, it wraps via <span className="font-mono bg-gray-100 px-0.5">x&#x2074; &#x2261; &#x2212;1</span> &mdash;
                so that term <em>subtracts</em> instead of adds. You run this loop once per
                output coefficient, touching all n inputs each time &rarr; n&sup2; total multiplications.
              </p>

              {naiveCoeffs.map(row => (
                <div key={row.k} className="border border-red-100 rounded overflow-hidden">
                  <div className="bg-red-50 px-2 py-1 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-700">c[{row.k}]</span>
                    <span className="text-[10px] text-gray-500">coefficient of x^{row.k} in the result</span>
                  </div>
                  <div className="px-2 py-2">
                    <table className="text-[11px] w-full border-collapse">
                      <thead>
                        <tr className="text-[10px] text-gray-400">
                          <th className="text-left px-1 py-0.5">f term</th>
                          <th className="text-left px-1 py-0.5">g term</th>
                          <th className="text-left px-1 py-0.5">product</th>
                          <th className="text-left px-1 py-0.5">sign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.direct.map((t, i) => (
                          <tr key={`d${i}`} className="hover:bg-gray-50">
                            <td className="px-1 py-0.5 font-mono text-blue-700">{t.fi}</td>
                            <td className="px-1 py-0.5 font-mono text-orange-600">{t.gj}</td>
                            <td className="px-1 py-0.5 font-mono font-bold">{t.prod}</td>
                            <td className="px-1 py-0.5 text-green-600 text-[10px]">+ (normal)</td>
                          </tr>
                        ))}
                        {row.wrapped.map((t, i) => (
                          <tr key={`w${i}`} className="bg-red-50 hover:bg-red-100">
                            <td className="px-1 py-0.5 font-mono text-blue-700">{t.fi}</td>
                            <td className="px-1 py-0.5 font-mono text-orange-600">{t.gj}</td>
                            <td className="px-1 py-0.5 font-mono font-bold">{t.prod}</td>
                            <td className="px-1 py-0.5 text-red-600 text-[10px]">&#x2212; (x&#x2074;&#x2261;&#x2212;1 wrap)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-1.5 font-mono text-[11px] text-gray-700">
                      {row.sum} &#x2261; <span className="font-bold text-green-700">{row.result}</span> mod 3329
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-800">
                4 output coefficients &times; 4 input pairs each = <strong>16 multiplications</strong> total.
                At n=256: 256&sup2; = <strong>65,536 multiplications</strong> for one polynomial product.
              </div>
            </div>
          )}
        </div>

        {/* METHOD 2: NTT */}
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowNtt(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-green-50 hover:bg-green-100 text-left"
          >
            <span className="text-xs font-bold text-green-700">
              Method 2 &mdash; NTT way &nbsp;&middot;&nbsp; O(n log n)
            </span>
            <span className="text-[10px] font-mono text-green-500">{showNtt ? '\u25b2 hide' : '\u25bc show steps'}</span>
          </button>

          {showNtt && (
            <div className="px-3 py-3 space-y-3">
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Transform both polynomials into a domain where multiplication is just
                coefficient-by-coefficient (pointwise). Multiply. Transform back.
                The transforms cost O(n log n). The pointwise step costs O(n). Total: far less than O(n&sup2;).
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Twiddle factors are powers of <span className="font-mono bg-gray-100 px-0.5">w&#x2088; = 749</span>,
                the primitive 8th root of unity mod 3329 (749&#x2078; &#x2261; 1, 749&#x2074; &#x2261; &#x2212;1).
                INTT uses the inverse <span className="font-mono bg-gray-100 px-0.5">w&#x2088;&#x207B;&#xB9; = 3289</span> and
                scales by <span className="font-mono bg-gray-100 px-0.5">4&#x207B;&#xB9; = 2497</span> mod 3329.
              </p>

              {/* NTT Matrix */}
              <div className="border border-purple-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-3 py-2 border-b border-purple-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-purple-700">
                    The NTT Transform Matrix &mdash; M where NTT(f) = M &middot; f
                  </div>
                  <div className="text-[10px] text-purple-500 mt-0.5">
                    M[k][j] = w&#x2088;^(j&middot;(2k+1)) mod 3329 &nbsp;&middot;&nbsp; w&#x2088; = 749 (primitive 8th root of unity)
                  </div>
                </div>
                <div className="px-3 py-3 bg-white space-y-3">
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    NTT is a linear transform &mdash; it&apos;s literally a matrix multiplication.
                    Row k of the matrix contains the twiddle factors for output F[k].
                    Each entry is a power of w&#x2088;=749, the primitive 8th root of unity mod 3329.
                    Column j tells you how much f[j] contributes to each output slot.
                  </p>

                  {/* The matrix itself */}
                  <div className="overflow-x-auto">
                    <table className="text-[11px] border-collapse mx-auto">
                      <thead>
                        <tr>
                          <td className="px-2 py-1" />
                          {['f[0]', 'f[1]', 'f[2]', 'f[3]'].map(h => (
                            <th key={h} className="px-3 py-1 text-center font-bold text-blue-700 border-b-2 border-blue-200">
                              {h}
                            </th>
                          ))}
                          <td className="px-2 py-1" />
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-[10px] text-gray-400 text-right">values&nbsp;&rarr;</td>
                          {[3, 1, 4, 1].map((v, j) => (
                            <td key={j} className="px-3 py-0.5 text-center font-mono font-bold text-blue-600 text-xs">
                              {v}
                            </td>
                          ))}
                          <td className="px-2 py-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { k: 0, label: 'F[0]', row: [{ sym: 'w⁰=1', val: 1 }, { sym: 'w¹=749', val: 749 }, { sym: 'w²=1729', val: 1729 }, { sym: 'w³=40', val: 40 }], result: 1050 },
                          { k: 1, label: 'F[1]', row: [{ sym: 'w⁰=1', val: 1 }, { sym: 'w³=40', val: 40 }, { sym: 'w⁶=1600', val: 1600 }, { sym: 'w¹=749', val: 749 }], result: 534 },
                          { k: 2, label: 'F[2]', row: [{ sym: 'w⁰=1', val: 1 }, { sym: 'w⁵=2580', val: 2580 }, { sym: 'w²=1729', val: 1729 }, { sym: 'w⁷=3289', val: 3289 }], result: 2801 },
                          { k: 3, label: 'F[3]', row: [{ sym: 'w⁰=1', val: 1 }, { sym: 'w⁷=3289', val: 3289 }, { sym: 'w⁶=1600', val: 1600 }, { sym: 'w⁵=2580', val: 2580 }], result: 2285 },
                        ].map(({ k, label, row, result }) => (
                          <tr key={k} className="hover:bg-purple-50">
                            <td className="px-2 py-1.5 font-bold text-purple-700 font-mono text-xs text-right border-r-2 border-purple-200">
                              {label}
                            </td>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-1.5 text-center border border-purple-100">
                                <div className="font-mono text-[10px] text-purple-500">{cell.sym}</div>
                                <div className="font-mono font-bold text-xs">{cell.val}</div>
                              </td>
                            ))}
                            <td className="px-3 py-1.5 font-mono font-bold text-green-700 text-xs border-l-2 border-green-200">
                              = {result}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* dot product walkthrough for F[0] */}
                  <div className="bg-purple-50 border border-purple-100 rounded px-3 py-2 text-[11px] text-purple-800 leading-relaxed">
                    <span className="font-bold">Reading row 0:</span> F[0] = 1&middot;3 + 749&middot;1 + 1729&middot;4 + 40&middot;1
                    = 3 + 749 + 6916 + 40 = 7708 &equiv; <strong>1050</strong> mod 3329.
                    Every row is a dot product of its twiddle-factor row with the coefficient vector [3,1,4,1].
                  </div>

                  {/* twiddle legend */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                      Twiddle factor legend &mdash; all 8 powers of w&#x2088;=749 mod 3329
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { exp: 0, val: 1 }, { exp: 1, val: 749 }, { exp: 2, val: 1729 }, { exp: 3, val: 40 },
                        { exp: 4, val: 3328 }, { exp: 5, val: 2580 }, { exp: 6, val: 1600 }, { exp: 7, val: 3289 },
                      ].map(({ exp, val }) => (
                        <div key={exp} className="font-mono text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center">
                          <span className="text-purple-600 font-bold">w&#x2088;^{exp}</span>
                          <span className="text-gray-500"> = {val}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Note w&#x2088;^4 = 3328 = &minus;1 mod 3329 &mdash; that&apos;s what makes this a negacyclic NTT (ring mod x&#x2074;+1).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: NTT(f) */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                  Step 1 &mdash; NTT(f) &nbsp; F[k] = &#x3A3;&#x2C7C; f[j] &middot; w&#x2088;^(j&middot;(2k+1)) mod 3329
                </div>
                <table className="text-[11px] w-full border-collapse">
                  <thead>
                    <tr className="bg-green-50 text-[10px] text-gray-500">
                      <th className="text-left px-2 py-1 border border-green-100">k</th>
                      <th className="text-left px-2 py-1 border border-green-100">computation (mod 3329)</th>
                      <th className="text-left px-2 py-1 border border-green-100">F[k]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nttF.map(r => (
                      <tr key={r.k} className="hover:bg-gray-50">
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold text-green-700">{r.k}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono text-gray-700">{r.formula}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold">{r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 2: NTT(g) */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                  Step 2 &mdash; NTT(g)
                </div>
                <table className="text-[11px] w-full border-collapse">
                  <thead>
                    <tr className="bg-green-50 text-[10px] text-gray-500">
                      <th className="text-left px-2 py-1 border border-green-100">k</th>
                      <th className="text-left px-2 py-1 border border-green-100">computation (mod 3329)</th>
                      <th className="text-left px-2 py-1 border border-green-100">G[k]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nttG.map(r => (
                      <tr key={r.k} className="hover:bg-gray-50">
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold text-green-700">{r.k}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono text-gray-700">{r.formula}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold">{r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 3: pointwise */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                  Step 3 &mdash; Pointwise H[k] = F[k] &middot; G[k] mod 3329
                  <span className="ml-2 font-normal text-gray-400 normal-case">&#x2190; replaces the entire double loop</span>
                </div>
                <table className="text-[11px] w-full border-collapse">
                  <thead>
                    <tr className="bg-yellow-50 text-[10px] text-gray-500">
                      <th className="text-left px-2 py-1 border border-yellow-100">k</th>
                      <th className="text-left px-2 py-1 border border-yellow-100">F[k]</th>
                      <th className="text-left px-2 py-1 border border-yellow-100">G[k]</th>
                      <th className="text-left px-2 py-1 border border-yellow-100">F&middot;G raw</th>
                      <th className="text-left px-2 py-1 border border-yellow-100">H[k] mod 3329</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointwise.map(r => (
                      <tr key={r.k} className="hover:bg-yellow-50">
                        <td className="px-2 py-1 border border-yellow-100 font-mono font-bold text-yellow-700">{r.k}</td>
                        <td className="px-2 py-1 border border-yellow-100 font-mono">{r.a}</td>
                        <td className="px-2 py-1 border border-yellow-100 font-mono">{r.b}</td>
                        <td className="px-2 py-1 border border-yellow-100 font-mono text-gray-400">{r.raw}</td>
                        <td className="px-2 py-1 border border-yellow-100 font-mono font-bold">{r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 4: INTT */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                  Step 4 &mdash; INTT(H) &rarr; result h[j]
                </div>
                <table className="text-[11px] w-full border-collapse">
                  <thead>
                    <tr className="bg-green-50 text-[10px] text-gray-500">
                      <th className="text-left px-2 py-1 border border-green-100">j</th>
                      <th className="text-left px-2 py-1 border border-green-100">simplified as (mod 3329)</th>
                      <th className="text-left px-2 py-1 border border-green-100">h[j]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inttSteps.map(r => (
                      <tr key={r.j} className="hover:bg-gray-50">
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold text-green-700">{r.j}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono text-gray-600">{r.raw}</td>
                        <td className="px-2 py-1 border border-green-100 font-mono font-bold">{r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Final comparison */}
        <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-3 py-1.5">
            <span className="text-white text-xs font-bold">Both methods, same answer &#x2713;</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-blue-100 bg-blue-50">
            <div className="px-3 py-2">
              <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Naive result</div>
              {finalResult.map((v, i) => (
                <div key={i} className="font-mono text-xs text-gray-700">
                  h[{i}] = <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] font-bold text-green-600 uppercase mb-1">NTT result</div>
              {finalResult.map((v, i) => (
                <div key={i} className="font-mono text-xs text-gray-700">
                  h[{i}] = <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white px-3 py-2 text-[11px] text-gray-600 leading-relaxed border-t border-blue-100">
            <span className="font-bold text-gray-800">f &middot; g = </span>
            <span className="font-mono">3316 + 3319x + 10x&#xB2; + 55x&#xB3;</span>
            <span className="ml-2 text-gray-400">(coefficients mod 3329, ring mod x&#x2074;+1)</span>
            <br />
            NTT got there with fewer multiplications. At n=256 that gap is <strong>65,536 vs 2,048</strong> &mdash; a 32&times; difference that happens on every single polynomial product in ML-KEM.
          </div>
        </div>

      </div>
    </div>
  );
}

// ── StepCard sub-component ────────────────────────────────────────────────────

interface StepCardProps {
  who:   string;
  n:     string;
  label: string;
  color: 'blue' | 'orange' | 'green';
  what:  string;
  why:   string;
  sizes: { label: string; value: string }[];
}

const COLOR: Record<string, { badge: string; border: string; size: string }> = {
  blue:   { badge: 'bg-blue-600 text-white',   border: 'border-blue-200',   size: 'bg-blue-50 text-blue-800'   },
  orange: { badge: 'bg-orange-500 text-white', border: 'border-orange-200', size: 'bg-orange-50 text-orange-800' },
  green:  { badge: 'bg-green-600 text-white',  border: 'border-green-200',  size: 'bg-green-50 text-green-800'  },
};

function StepCard({ who, n, label, color, what, why, sizes }: StepCardProps) {
  const c = COLOR[color];
  return (
    <div className={`border rounded-lg overflow-hidden ${c.border}`}>
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.badge}`}>{who}</span>
        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Step {n}</span>
        <span className="text-sm font-bold text-gray-900">{label}</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">What it computes</div>
            <p className="text-xs text-gray-700 leading-relaxed">{what}</p>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Why it matters</div>
            <p className="text-xs text-gray-600 leading-relaxed">{why}</p>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Sizes</div>
          <div className="space-y-1">
            {sizes.map(s => (
              <div key={s.label} className={`text-[10px] font-mono px-2 py-1 rounded ${c.size}`}>
                <div className="font-bold">{s.label}</div>
                <div className="opacity-80">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
