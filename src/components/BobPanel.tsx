/**
 * Bob — single growing table, columns added per step.
 */

import { useStore } from '../store/keygenStore';
import { stageBobGenerateA, stageBobComputeUV, stageBobCompress } from '../crypto/encapsulate';
import { CoeffTable } from './CoeffTable.tsx';
import type { ColDef, ColGroup } from './CoeffTable.tsx';

interface Props {
  onCompressed: () => void;
}

export function BobPanel({ onCompressed }: Props) {
  const {
    aliceKey, aliceNtt, aliceT, alicePubKey,
    bobA, bobUV, bobCompress,
    setBobA, setBobUV, setBobCompress,
    busy, setBusy,
  } = useStore();

  const run = (fn: () => void, after?: () => void) => {
    setBusy(true);
    setTimeout(() => { fn(); setBusy(false); after?.(); }, 50);
  };

  // ── columns ───────────────────────────────────────────────────────────────────
  const cols: ColDef[]    = [];
  const groups: ColGroup[] = [];

  if (bobA) {
    cols.push(
      { key: 'ba00', header: 'Bob A[0][0]', sub: '16-bit · 512B', data: bobA.bobA00, bg: '#ffedd5', cellBg: '#fff7ed' },
      { key: 'ba01', header: 'Bob A[0][1]', sub: '16-bit · 512B', data: bobA.bobA01, bg: '#ffedd5', cellBg: '#fff7ed' },
      { key: 'ba10', header: 'Bob A[1][0]', sub: '16-bit · 512B', data: bobA.bobA10, bg: '#ffedd5', cellBg: '#fff7ed' },
      { key: 'ba11', header: 'Bob A[1][1]', sub: '16-bit · 512B', data: bobA.bobA11, bg: '#ffedd5', cellBg: '#fff7ed' },
    );
    groups.push({ label: 'Stage 1 — Bob A  (re-derived from ρ)', bg: '#c2410c', keys: ['ba00','ba01','ba10','ba11'] });
  }

  if (bobUV) {
    cols.push(
      { key: 'encm', header: 'encode(m)',  sub: '0 or 1665 · 512B', data: bobUV.encM, bg: '#fef9c3', cellBg: '#fefce8' },
      { key: 'u0',   header: 'U[0]',       sub: '16-bit · 512B',    data: bobUV.U0,   bg: '#dbeafe', cellBg: '#eff6ff' },
      { key: 'u1',   header: 'U[1]',       sub: '16-bit · 512B',    data: bobUV.U1,   bg: '#dbeafe', cellBg: '#eff6ff' },
      { key: 'ttr',  header: 't^T r',      sub: '16-bit · 512B',    data: bobUV.tTr,  bg: '#e5e7eb', cellBg: '#f9fafb' },
      { key: 'v',    header: 'V',          sub: '16-bit · 512B',    data: bobUV.V,    bg: '#ede9fe', cellBg: '#f5f3ff' },
    );
    groups.push({ label: 'Stage 2 — encode(m) · U = A^T r + e1 · V = t^T r + e2 + encode(m)', bg: '#1d4ed8', keys: ['encm','u0','u1','ttr','v'] });
  }

  if (bobCompress) {
    cols.push(
      { key: 'cu0', header: 'Compress(U[0], 10)', sub: '10-bit · 320B', data: bobCompress.U0c, bits: 10, bg: '#bae6fd', cellBg: '#f0f9ff' },
      { key: 'cu1', header: 'Compress(U[1], 10)', sub: '10-bit · 320B', data: bobCompress.U1c, bits: 10, bg: '#bae6fd', cellBg: '#f0f9ff' },
      { key: 'cv',  header: 'Compress(V, 4)',      sub: '4-bit  · 128B', data: bobCompress.Vc,  bits:  4, bg: '#fbcfe8', cellBg: '#fdf2f8' },
    );
    groups.push({ label: 'Stage 3 — Ciphertext  Compress(U,10) + Compress(V,4) = 768B', bg: '#0369a1', keys: ['cu0','cu1','cv'] });
  }

  const hasCols = cols.length > 0;

  return (
    <div className="border-2 border-orange-300 rounded-lg bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-orange-500 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">BOB — Encapsulation</h2>
          <p className="text-orange-100 text-sm mt-0.5">FIPS 203 · ML-KEM-512 · Receives Alice public key, generates ciphertext (u, v)</p>
        </div>
        {hasCols && (
          <span className="text-orange-100 text-sm font-mono">{cols.length} columns · scroll →</span>
        )}
      </div>

      <div className="px-6 py-5">

        {!alicePubKey && (
          <p className="text-base text-gray-400 italic mb-4">Complete Alice's key generation (steps 1–5) first.</p>
        )}

        {/* ── Step buttons ── */}
        <div className="flex flex-wrap gap-3 mb-5">

          {/* Step 1 */}
          <StepBtn
            n={1} label="Generate Bob A"
            active={!!bobA}
            onClick={() => run(() => setBobA(stageBobGenerateA(alicePubKey!, aliceKey!)))}
            disabled={!alicePubKey || busy}
          />

          {/* Step 2 — Compare A: no alert, inline badge */}
          <div className="flex items-center gap-2">
            <StepBtn
              n={2} label="Compare A  (Bob = Alice)"
              active={bobA?.aMatch === true}
              onClick={() => { /* result already visible in badge below */ }}
              disabled={!bobA || busy}
              forceActive={bobA?.aMatch === true}
            />
            {bobA && (
              <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border-2 ${
                bobA.aMatch
                  ? 'bg-green-50 border-green-400 text-green-800'
                  : 'bg-red-50 border-red-400 text-red-800'
              }`}>
                {bobA.aMatch ? '✓ Match' : '✗ Mismatch'}
              </span>
            )}
          </div>

          {/* Step 3 */}
          <StepBtn
            n={3} label="Compute U and V"
            active={!!bobUV}
            onClick={() => run(() => setBobUV(stageBobComputeUV(aliceT!, aliceNtt!, bobA!)))}
            disabled={!bobA || !aliceT || !aliceNtt || busy}
          />

          {/* Step 4 */}
          <StepBtn
            n={4} label="Compress Ciphertext"
            active={!!bobCompress}
            onClick={() => run(() => setBobCompress(stageBobCompress(bobUV!)), onCompressed)}
            disabled={!bobUV || busy}
          />
        </div>

        {/* ── Secret m ── */}
        {bobUV && (
          <div className="mb-4 border border-yellow-300 bg-yellow-50 rounded-lg px-5 py-3">
            <div className="text-sm font-bold text-yellow-800 mb-1">Bob's random secret m  (32 bytes = 256 bits)</div>
            <div className="font-mono text-sm text-gray-700 break-all leading-relaxed">
              {Array.from(bobUV.m).map(b => b.toString(16).padStart(2, '0')).join(' ')}
            </div>
          </div>
        )}

        {/* ── Ciphertext size badge ── */}
        {bobCompress && (
          <div className="mb-4 flex items-center gap-2 flex-wrap text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg px-5 py-3">
            <span className="font-bold text-gray-700">c =</span>
            <span className="px-2 py-0.5 bg-sky-100 rounded text-sky-800">Compress(U[0],10)  320B</span>
            <span className="text-gray-400">‖</span>
            <span className="px-2 py-0.5 bg-sky-100 rounded text-sky-800">Compress(U[1],10)  320B</span>
            <span className="text-gray-400">‖</span>
            <span className="px-2 py-0.5 bg-pink-100 rounded text-pink-800">Compress(V,4)  128B</span>
            <span className="text-gray-400">=</span>
            <span className="px-3 py-0.5 bg-green-200 rounded font-bold text-green-800 text-base">768B ✓</span>
          </div>
        )}

        {/* ── Growing table ── */}
        {hasCols && <CoeffTable cols={cols} groups={groups} />}

        {!hasCols && alicePubKey && (
          <p className="text-base text-gray-400 italic py-10 text-center">
            Press "1. Generate Bob A" to start
          </p>
        )}
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

function StepBtn({ n, label, active, onClick, disabled, forceActive }: {
  n: number; label: string; active: boolean; onClick: () => void;
  disabled: boolean; forceActive?: boolean;
}) {
  const isDone = active || forceActive;
  const base   = 'px-4 py-2.5 text-sm font-bold rounded-lg border-2 transition disabled:cursor-not-allowed';
  const style  = isDone
    ? 'bg-orange-600 border-orange-700 text-white'
    : disabled
      ? 'bg-gray-50 border-gray-200 text-gray-400'
      : 'bg-white border-orange-400 text-orange-700 hover:bg-orange-50';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {isDone ? '✓ ' : `${n}. `}{label}
    </button>
  );
}
