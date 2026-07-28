/**
 * KeyGenFlowDiagram — visual flow diagram of ML-KEM-512 key generation
 * Shows the full pipeline from OS randomness → public key
 * Pure HTML/CSS — no external charting library needed.
 */

export function KeyGenFlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }} className="px-2 py-4">

        {/* ── Row 1: Seed source ── */}
        <Row>
          <Source
            label="OS / Hardware RNG"
            sub="Web Crypto API  (crypto.getRandomValues)"
            color="gray"
          />
        </Row>

        <Arrow down label="32 + 32 bytes of randomness" />

        {/* ── Row 2: G — FIPS 203 Algorithm 13 ── */}
        <Row>
          <Box
            title="G  (SHA3-512)"
            sub="FIPS 203 §5.1 Algorithm 13"
            color="purple"
            items={[
              'Input: 64 random bytes (d ‖ 0x02)',
              'Output: 64 bytes = two 32-byte halves',
            ]}
          />
        </Row>

        {/* ── Row 3: ρ and σ split ── */}
        <div className="flex justify-center gap-2 my-1">
          <DownArrowSplit />
        </div>

        <Row gap>
          <Box
            title="ρ  (rho)"
            sub="32 bytes · public seed"
            color="blue"
            items={[
              'Used by XOF to expand matrix A',
              'Included in public key pk',
              'Anyone can see ρ',
            ]}
          />
          <Box
            title="σ  (sigma)"
            sub="32 bytes · private seed"
            color="green"
            items={[
              'Used by PRF to sample s and e',
              'Never leaves Alice',
              'Kept secret',
            ]}
          />
        </Row>

        {/* ── Two parallel paths ── */}
        <div className="flex justify-center gap-2 my-1">
          <DownArrowDual left="XOF  (SHAKE-128)" right="PRF  (SHAKE-256)" />
        </div>

        <Row gap>
          {/* Left: Matrix A */}
          <Box
            title="XOF(ρ, i, j)  →  Matrix A"
            sub="FIPS 203 §4.2.1 SampleNTT"
            color="blue"
            items={[
              'ρ seeded into SHAKE-128',
              'One call per polynomial A[i][j]',
              'Rejection sampling keeps coeff < q = 3329',
              'Output: 4 polynomials, each 256 × 16-bit',
              'Already in NTT domain (â[i][j])',
              'Size: 4 × 512B = 2048B',
            ]}
          />
          {/* Right: s and e */}
          <Box
            title="PRF(σ, N)  →  s  and  e"
            sub="FIPS 203 §4.2.2 SamplePolyCBD"
            color="green"
            items={[
              'σ seeded into SHAKE-256',
              'Counter N increments per polynomial',
              'Centered Binomial Distribution η=2',
              'Each coeff: a − b,  a,b ∈ {0,1,1}',
              'Result: signed small values in [−2, 2]',
              's[0], s[1]: secret key  (2 × 512B)',
              'e[0], e[1]: error noise (2 × 512B)',
            ]}
          />
        </Row>

        <div className="flex justify-center my-1">
          <Arrow down label="" />
        </div>

        {/* ── NTT of s ── */}
        <Row>
          <Box
            title="NTT(s[0]),  NTT(s[1])"
            sub="FIPS 203 §4.3 Algorithm 9"
            color="violet"
            items={[
              'Forward NTT applied to each secret polynomial',
              'Cooley–Tukey butterfly, 7 levels',
              'Zeta schedule: ζ^BitRev7(k),  ζ = 17',
              'Transforms time-domain s → NTT domain ŝ',
              'Size stays 2 × 512B',
            ]}
          />
        </Row>

        <Arrow down label="NTT-domain matrix-vector multiply" />

        {/* ── Matrix multiply AS ── */}
        <Row>
          <Box
            title="AS  =  INTT( Σⱼ  â[i][j] ⊙ ŝ[j] )"
            sub="FIPS 203 §5.1 — pointwise in NTT domain, then INTT"
            color="amber"
            items={[
              'Row 0: â[0][0] ⊙ ŝ[0]  +  â[0][1] ⊙ ŝ[1]   → INTT → AS[0]',
              'Row 1: â[1][0] ⊙ ŝ[0]  +  â[1][1] ⊙ ŝ[1]   → INTT → AS[1]',
              '⊙ = base-case multiply (FIPS 203 Algorithm 12)',
              'Accumulate in NTT domain, single INTT at end',
              'Output: AS[0], AS[1]  (2 × 512B, 16-bit coefficients)',
            ]}
          />
        </Row>

        <Arrow down label="add error e  (MLWE hardness)" />

        {/* ── t = AS + e ── */}
        <Row>
          <Box
            title="t  =  AS + e"
            sub="FIPS 203 §5.1 — the public key material"
            color="orange"
            items={[
              't[0] = AS[0] + e[0]   (coefficient-wise mod q)',
              't[1] = AS[1] + e[1]',
              'Without e: recovering s from (A,t=AS) is easy linear algebra',
              'With e: becomes MLWE problem — quantum-hard',
              'Size: 2 × 512B = 1024B  (raw 16-bit)',
            ]}
          />
        </Row>

        <Arrow down label="ByteEncode₁₂ — pack 256 × 12-bit = 384B" />

        {/* ── Encode ── */}
        <Row>
          <Box
            title="ByteEncode₁₂(t[0]),  ByteEncode₁₂(t[1])"
            sub="FIPS 203 §4.2.1 — lossless since q < 2¹²"
            color="cyan"
            items={[
              'Each coefficient c ∈ [0, 3328]  fits in 12 bits  (q < 4096)',
              'Pack 2 coefficients into 3 bytes',
              '256 coefficients → 384 bytes per polynomial',
              'Saves 128B vs 16-bit storage',
              'Size: 2 × 384B = 768B',
            ]}
          />
        </Row>

        <Arrow down label="concatenate  ρ ‖ enc(t[0]) ‖ enc(t[1])" />

        {/* ── Public Key ── */}
        <Row>
          <Box
            title="Public Key  pk"
            sub="800 bytes — sent to Bob"
            color="green"
            highlight
            items={[
              'ρ        (32B)  — Bob uses this to re-derive the same matrix A',
              'enc(t[0])  (384B)  — encoded public key material row 0',
              'enc(t[1])  (384B)  — encoded public key material row 1',
              'Total: 32 + 384 + 384 = 800 bytes',
              'Alice keeps s as private key  (never transmitted)',
            ]}
          />
        </Row>

      </div>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Row({ children, gap }: { children: React.ReactNode; gap?: boolean }) {
  return (
    <div className={`flex justify-center ${gap ? 'gap-6' : ''}`}>
      {children}
    </div>
  );
}

function Arrow({ label }: { down?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center my-2">
      <div className="w-0.5 h-5 bg-gray-400" />
      <div className="text-xs text-gray-500 font-mono px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-center max-w-xs">
        {label}
      </div>
      <div className="w-0.5 h-5 bg-gray-400" />
      <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-400" />
    </div>
  );
}

function DownArrowSplit() {
  return (
    <div className="flex flex-col items-center my-2 w-full max-w-2xl">
      {/* Single stem */}
      <div className="w-0.5 h-5 bg-gray-400" />
      {/* Horizontal split bar */}
      <div className="relative w-80 h-0.5 bg-gray-400">
        {/* Left arm */}
        <div className="absolute left-0 top-0 w-0.5 h-5 bg-gray-400" style={{ transform: 'translateX(-50%)' }} />
        {/* Right arm */}
        <div className="absolute right-0 top-0 w-0.5 h-5 bg-gray-400" style={{ transform: 'translateX(50%)' }} />
        {/* Left label */}
        <div className="absolute left-0 -top-6 text-xs text-purple-700 font-bold whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>ρ (bytes 0–31)</div>
        {/* Right label */}
        <div className="absolute right-0 -top-6 text-xs text-green-700 font-bold whitespace-nowrap" style={{ transform: 'translateX(50%)' }}>σ (bytes 32–63)</div>
      </div>
    </div>
  );
}

function DownArrowDual({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-center gap-6 w-full max-w-2xl my-2">
      <div className="flex flex-col items-center flex-1">
        <div className="w-0.5 h-4 bg-gray-400" />
        <div className="text-xs text-gray-500 font-mono px-2 py-0.5 bg-gray-50 border border-gray-200 rounded">{left}</div>
        <div className="w-0.5 h-4 bg-gray-400" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-400" />
      </div>
      <div className="flex flex-col items-center flex-1">
        <div className="w-0.5 h-4 bg-gray-400" />
        <div className="text-xs text-gray-500 font-mono px-2 py-0.5 bg-gray-50 border border-gray-200 rounded">{right}</div>
        <div className="w-0.5 h-4 bg-gray-400" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-400" />
      </div>
    </div>
  );
}

function Source({ label, sub }: { label: string; sub: string; color: string }) {
  return (
    <div className="border-2 border-gray-400 rounded-lg px-6 py-3 bg-gray-100 text-center w-96">
      <div className="text-base font-bold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500 mt-0.5 font-mono">{sub}</div>
    </div>
  );
}

// ── Box node ──────────────────────────────────────────────────────────────────

const COLORS: Record<string, { border: string; header: string; headerText: string; bg: string }> = {
  purple: { border: 'border-purple-400', header: 'bg-purple-600', headerText: 'text-white', bg: 'bg-purple-50' },
  blue:   { border: 'border-blue-400',   header: 'bg-blue-600',   headerText: 'text-white', bg: 'bg-blue-50'   },
  green:  { border: 'border-green-400',  header: 'bg-green-600',  headerText: 'text-white', bg: 'bg-green-50'  },
  violet: { border: 'border-violet-400', header: 'bg-violet-600', headerText: 'text-white', bg: 'bg-violet-50' },
  amber:  { border: 'border-amber-400',  header: 'bg-amber-500',  headerText: 'text-white', bg: 'bg-amber-50'  },
  orange: { border: 'border-orange-400', header: 'bg-orange-500', headerText: 'text-white', bg: 'bg-orange-50' },
  cyan:   { border: 'border-cyan-400',   header: 'bg-cyan-600',   headerText: 'text-white', bg: 'bg-cyan-50'   },
  gray:   { border: 'border-gray-400',   header: 'bg-gray-600',   headerText: 'text-white', bg: 'bg-gray-50'   },
};

function Box({ title, sub, color, items, highlight }: {
  title: string; sub: string; color: string;
  items: string[]; highlight?: boolean;
}) {
  const c = COLORS[color] ?? COLORS.gray;
  return (
    <div className={`border-2 rounded-lg overflow-hidden w-full max-w-lg ${c.border} ${highlight ? 'shadow-lg' : ''}`}>
      <div className={`px-4 py-2 ${c.header}`}>
        <div className={`text-sm font-bold ${c.headerText} font-mono`}>{title}</div>
        <div className={`text-xs ${c.headerText} opacity-80 mt-0.5`}>{sub}</div>
      </div>
      <div className={`px-4 py-3 ${c.bg}`}>
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="text-gray-400 mt-0.5 shrink-0">▸</span>
              <span className="font-mono leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
