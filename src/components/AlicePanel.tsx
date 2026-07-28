/**
 * Alice — all buttons in ONE row, columns grow right per step.
 * Decap buttons (6-8) live in the same bar, enabled only after Bob compresses.
 */

import { useStore } from '../store/keygenStore';
import { stageGenerateKey, stageNTT, stageAddError, stageEncode, stagePublicKey } from '../crypto/mlkem';
import { stageAliceSTU, stageAliceDecap, stageCompare } from '../crypto/encapsulate';
import { CoeffTable } from './CoeffTable.tsx';
import type { ColDef, ColGroup } from './CoeffTable.tsx';

interface Props {
  onPubKeyGenerated: () => void;
}

export function AlicePanel({ onPubKeyGenerated }: Props) {
  const {
    aliceKey, aliceNtt, aliceT, aliceEnc, alicePubKey,
    bobUV, bobCompress, aliceSTU, aliceDecap, compare,
    setAliceKey, setAliceNtt, setAliceT, setAliceEnc, setAlicePubKey,
    setAliceSTU, setAliceDecap, setCompare,
    busy, setBusy,
  } = useStore();

  const run = (fn: () => void, after?: () => void) => {
    setBusy(true);
    setTimeout(() => { fn(); setBusy(false); after?.(); }, 50);
  };

  // ── build columns ─────────────────────────────────────────────────────────────
  const cols: ColDef[]    = [];
  const groups: ColGroup[] = [];

  if (aliceKey) {
    cols.push(
      { key: 's0',  header: 's[0]',    sub: 'secret · 16b · 512B', data: aliceKey.s0,  bg: '#dcfce7', cellBg: '#f0fdf4' },
      { key: 's1',  header: 's[1]',    sub: 'secret · 16b · 512B', data: aliceKey.s1,  bg: '#dcfce7', cellBg: '#f0fdf4' },
      { key: 'a00', header: 'A[0][0]', sub: 'matrix · 16b · 512B', data: aliceKey.A00, bg: '#dbeafe', cellBg: '#eff6ff' },
      { key: 'a01', header: 'A[0][1]', sub: 'matrix · 16b · 512B', data: aliceKey.A01, bg: '#dbeafe', cellBg: '#eff6ff' },
      { key: 'a10', header: 'A[1][0]', sub: 'matrix · 16b · 512B', data: aliceKey.A10, bg: '#dbeafe', cellBg: '#eff6ff' },
      { key: 'a11', header: 'A[1][1]', sub: 'matrix · 16b · 512B', data: aliceKey.A11, bg: '#dbeafe', cellBg: '#eff6ff' },
    );
    groups.push({ label: 'Stage 1 — Secret s  &  Matrix A', bg: '#16a34a', keys: ['s0','s1','a00','a01','a10','a11'] });
  }

  if (aliceNtt) {
    cols.push(
      { key: 'na00', header: 'NTT(A[0][0])', sub: '16b · 512B', data: aliceNtt.nttA00, bg: '#ede9fe', cellBg: '#f5f3ff' },
      { key: 'na01', header: 'NTT(A[0][1])', sub: '16b · 512B', data: aliceNtt.nttA01, bg: '#ede9fe', cellBg: '#f5f3ff' },
      { key: 'na10', header: 'NTT(A[1][0])', sub: '16b · 512B', data: aliceNtt.nttA10, bg: '#ede9fe', cellBg: '#f5f3ff' },
      { key: 'na11', header: 'NTT(A[1][1])', sub: '16b · 512B', data: aliceNtt.nttA11, bg: '#ede9fe', cellBg: '#f5f3ff' },
      { key: 'ns0',  header: 'NTT(s[0])',    sub: '16b · 512B', data: aliceNtt.nttS0,  bg: '#dcfce7', cellBg: '#f0fdf4' },
      { key: 'ns1',  header: 'NTT(s[1])',    sub: '16b · 512B', data: aliceNtt.nttS1,  bg: '#dcfce7', cellBg: '#f0fdf4' },
      { key: 'as0',  header: 'AS[0]',        sub: 'INTT(NTT(A)·NTT(s))', data: aliceNtt.AS0, bg: '#fef9c3', cellBg: '#fefce8' },
      { key: 'as1',  header: 'AS[1]',        sub: 'INTT(NTT(A)·NTT(s))', data: aliceNtt.AS1, bg: '#fef9c3', cellBg: '#fefce8' },
    );
    groups.push({ label: 'Stage 2 — NTT(A), NTT(s),  AS = INTT(NTT(A)·NTT(s))', bg: '#7c3aed', keys: ['na00','na01','na10','na11','ns0','ns1','as0','as1'] });
  }

  if (aliceT) {
    cols.push(
      { key: 'e0', header: 'e[0]',               sub: 'CBD small · 16b', data: aliceT.e0, bg: '#fee2e2', cellBg: '#fff7f7' },
      { key: 'e1', header: 'e[1]',               sub: 'CBD small · 16b', data: aliceT.e1, bg: '#fee2e2', cellBg: '#fff7f7' },
      { key: 't0', header: 't[0] = AS[0]+e[0]',  sub: 'raw · 16b · 512B', data: aliceT.t0, bg: '#ffedd5', cellBg: '#fff7ed' },
      { key: 't1', header: 't[1] = AS[1]+e[1]',  sub: 'raw · 16b · 512B', data: aliceT.t1, bg: '#ffedd5', cellBg: '#fff7ed' },
    );
    groups.push({ label: 'Stage 3 — t = AS + e', bg: '#b45309', keys: ['e0','e1','t0','t1'] });
  }

  if (aliceEnc) {
    cols.push(
      { key: 'enc0', header: 'encode₁₂(t[0])', sub: '12b · 384B', data: aliceEnc.t0enc, bits: 12, bg: '#cffafe', cellBg: '#ecfeff' },
      { key: 'enc1', header: 'encode₁₂(t[1])', sub: '12b · 384B', data: aliceEnc.t1enc, bits: 12, bg: '#cffafe', cellBg: '#ecfeff' },
    );
    groups.push({ label: 'Stage 4 — encode₁₂(t) · 384B each', bg: '#0e7490', keys: ['enc0','enc1'] });
  }

  if (aliceSTU) {
    cols.push(
      { key: 'stu', header: 's^T u', sub: 'Σ s[k]·u[k] · 16b', data: aliceSTU.sTU, bg: '#d1fae5', cellBg: '#ecfdf5' },
    );
    groups.push({ label: 'Step 6 — s^T u', bg: '#065f46', keys: ['stu'] });
  }

  if (aliceDecap) {
    cols.push(
      { key: 'w',     header: 'w = v − s^Tu',  sub: '≈ encode(m)+noise',         data: aliceDecap.w,         bg: '#d1fae5', cellBg: '#ecfdf5' },
      { key: 'encm',  header: 'encode(m)',     sub: "Bob's secret · 0 or 1664",  data: bobUV!.encM,          bg: '#fef9c3', cellBg: '#fefce8' },
      { key: 'recov', header: 'decoded bit',   sub: 'round(w·2/q)%2',            data: aliceDecap.recovered, bits: 1,       bg: '#bbf7d0', cellBg: '#f0fdf4' },
    );
    groups.push({ label: "Step 7 — w = v−s^Tu · encode(m) Bob sent · decoded bits", bg: '#047857', keys: ['w','encm','recov'] });
  }

  const hasCols  = cols.length > 0;
  const bobDone  = !!bobCompress;   // Bob must compress before Alice can decap

  return (
    <div className="border-2 border-blue-300 rounded-lg bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ALICE — Key Generation &amp; Decapsulation</h2>
          <p className="text-blue-200 text-sm">FIPS 203 · ML-KEM-512 · Each button appends columns right</p>
        </div>
        {hasCols && (
          <span className="text-blue-200 text-xs font-mono">{cols.length} columns · scroll →</span>
        )}
      </div>

      <div className="px-6 py-4">

        {/* ── ALL buttons in one bar ── */}
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-200">

          {/* Key-gen buttons (blue) */}
          <Btn label="1. Generate Key (s, A)"  done={!!aliceKey}    onClick={() => run(() => setAliceKey(stageGenerateKey()))}                                                     disabled={busy} />
          <Btn label="2. NTT → AS"              done={!!aliceNtt}    onClick={() => run(() => setAliceNtt(stageNTT(aliceKey!)))}                                                    disabled={!aliceKey || busy} />
          <Btn label="3. Add Error → t=AS+e"    done={!!aliceT}      onClick={() => run(() => setAliceT(stageAddError(aliceNtt!)))}                                                 disabled={!aliceNtt || busy} />
          <Btn label="4. Compress t → 384B"     done={!!aliceEnc}    onClick={() => run(() => setAliceEnc(stageEncode(aliceT!)))}                                                   disabled={!aliceT || busy} />
          <Btn label="5. Generate Public Key"   done={!!alicePubKey} onClick={() => run(() => setAlicePubKey(stagePublicKey(aliceKey!.rho, aliceEnc!, aliceT!)), onPubKeyGenerated)} disabled={!aliceEnc || busy} />

          {/* Divider */}
          {alicePubKey && <span className="self-center text-gray-300 text-xl select-none">│</span>}

          {/* Decap buttons (green) — shown after pk generated, enabled only after Bob compresses */}
          {alicePubKey && (
            <>
              <Btn
                label="6. s^T u"
                done={!!aliceSTU}
                color="green"
                onClick={() => run(() => setAliceSTU(stageAliceSTU(aliceKey!, aliceNtt!, bobUV!)))}
                disabled={!bobDone || busy}
                hint={!bobDone ? 'Wait for Bob to compress ciphertext' : undefined}
              />
              <Btn
                label="7. v − s^Tu → decode(m)"
                done={!!aliceDecap}
                color="green"
                onClick={() => run(() => setAliceDecap(stageAliceDecap(bobUV!, aliceSTU!)))}
                disabled={!aliceSTU || busy}
              />
              <Btn
                label="8. Compare secrets"
                done={!!compare}
                color="green"
                onClick={() => run(() => setCompare(stageCompare(bobUV!.m, aliceDecap!.recovered)))}
                disabled={!aliceDecap || busy}
              />
            </>
          )}
        </div>

        {/* ── Status hints ── */}
        {alicePubKey && !bobDone && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ↓ Public key sent to Bob. Complete Bob's 4 steps below, then return here for decapsulation.
          </div>
        )}
        {bobDone && !aliceSTU && (
          <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            ✓ Bob sent ciphertext. Press "6. s^T u" to start decapsulation.
          </div>
        )}

        {/* ── Public key badge ── */}
        {alicePubKey && (
          <div className="mb-3 flex items-center gap-2 flex-wrap text-sm font-mono bg-gray-50 border border-gray-200 rounded px-4 py-2">
            <span className="font-bold text-gray-600">pk =</span>
            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700">ρ (32B)</span>
            <span className="text-gray-400">‖</span>
            <span className="px-2 py-0.5 bg-cyan-100 rounded text-cyan-800">enc(t[0]) (384B)</span>
            <span className="text-gray-400">‖</span>
            <span className="px-2 py-0.5 bg-cyan-100 rounded text-cyan-800">enc(t[1]) (384B)</span>
            <span className="text-gray-400">=</span>
            <span className="px-2 py-0.5 bg-green-200 rounded font-bold text-green-800">800B ✓</span>
          </div>
        )}

        {/* ── Growing table ── */}
        {hasCols && <CoeffTable cols={cols} groups={groups} />}

        {!hasCols && (
          <p className="text-gray-400 text-sm italic py-8 text-center">
            Press "1. Generate Key (s, A)" to start
          </p>
        )}

        {/* ── Secret extraction view ── */}
        {aliceDecap && bobUV && (
          <div className="mt-6 space-y-4">
            <div className="text-sm font-bold text-gray-700 border-t pt-4">Extracted Shared Secret</div>

            <div className="grid grid-cols-2 gap-4">
              {/* Bob's original */}
              <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
                <div className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wide">
                  Bob's original m (32 bytes)
                </div>
                <div className="font-mono text-xs leading-relaxed break-all">
                  {Array.from(bobUV.m).map((b, i) => {
                    const mismatch = compare && aliceDecap.recoveredBytes[i] !== b;
                    return (
                      <span key={i}
                        title={`byte[${i}] = 0x${b.toString(16).padStart(2,'0')}`}
                        className={`inline-block w-[22px] text-center mr-0.5 mb-0.5 rounded-sm text-[11px] ${mismatch ? 'bg-red-300 text-red-900 font-bold' : 'bg-orange-100 text-orange-900'}`}
                      >
                        {b.toString(16).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Alice's recovered */}
              <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                <div className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">
                  Alice's recovered m  — decode(v − s^Tu)
                </div>
                <div className="font-mono text-xs leading-relaxed break-all">
                  {Array.from(aliceDecap.recoveredBytes).map((b, i) => {
                    const mismatch = compare && b !== bobUV.m[i];
                    return (
                      <span key={i}
                        title={`byte[${i}] = 0x${b.toString(16).padStart(2,'0')}`}
                        className={`inline-block w-[22px] text-center mr-0.5 mb-0.5 rounded-sm text-[11px] ${mismatch ? 'bg-red-300 text-red-900 font-bold' : 'bg-green-100 text-green-900'}`}
                      >
                        {b.toString(16).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bit strip */}
            {compare && (
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">
                  Bit comparison — 256 bits &nbsp;
                  <span className="text-green-700">■ match</span> &nbsp;
                  <span className="text-red-600">■ error</span>
                </div>
                <div className="flex flex-wrap gap-px">
                  {compare.bobBits.map((b, i) => {
                    const ok = b === compare.aliceBits[i];
                    return (
                      <span key={i}
                        title={`bit[${i}]: Bob=${b} Alice=${compare.aliceBits[i]}`}
                        className={`w-[11px] h-[14px] flex items-center justify-center font-mono text-[8px] rounded-sm ${ok ? 'bg-green-200 text-green-800' : 'bg-red-500 text-white font-bold'}`}
                      >
                        {b}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verdict */}
            {compare && (
              <div className={`p-4 rounded-lg border-2 ${compare.errCount === 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xl font-bold">
                    {compare.errCount === 0
                      ? '✅ Shared secret extracted successfully'
                      : `⚠️ ${compare.errCount} bit error${compare.errCount > 1 ? 's' : ''}`}
                  </div>
                  <div className="font-mono text-sm text-gray-600">{256 - compare.errCount} / 256 bits correct</div>
                </div>
                {compare.errCount === 0 && (
                  <p className="mt-2 text-sm text-green-700">
                    Alice recovered Bob's m exactly via <code className="bg-green-100 px-1 rounded">decode(v − s^Tu)</code>.
                    Both parties now hold the same 256-bit shared secret.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Button component ──────────────────────────────────────────────────────────

function Btn({ label, done, onClick, disabled, color = 'blue', hint }: {
  label: string; done: boolean; onClick: () => void; disabled: boolean;
  color?: 'blue' | 'green'; hint?: string;
}) {
  const base  = 'px-3 py-2 text-sm font-bold rounded-lg border-2 transition disabled:cursor-not-allowed';
  const style = done
    ? (color === 'green' ? 'bg-green-600 border-green-700 text-white opacity-90' : 'bg-blue-700 border-blue-800 text-white opacity-90')
    : disabled
      ? (color === 'green' ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-400')
      : (color === 'green' ? 'bg-white border-green-500 text-green-700 hover:bg-green-50' : 'bg-white border-blue-500 text-blue-700 hover:bg-blue-50');
  return (
    <button onClick={onClick} disabled={disabled} title={hint} className={`${base} ${style}`}>
      {done ? '✓ ' : ''}{label}
    </button>
  );
}
