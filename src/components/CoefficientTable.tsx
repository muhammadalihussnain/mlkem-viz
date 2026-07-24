/**
 * ML-KEM-512 coefficient pipeline table.
 *
 * Key insight on encoding:
 *   q = 3329 < 2^12 = 4096
 *   So every coefficient fits in 12 bits.
 *   The NUMBER does not change — only storage shrinks from 16-bit to 12-bit.
 *   2450 in 16 bits  →  2450 in 12 bits. Same value, 4 bits saved per coefficient.
 *   256 coefficients × 4 bits saved = 128 bytes saved per polynomial.
 *   2 polynomials × 128B = 256B saved total (1024B raw → 768B encoded).
 */

import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CoefficientRow } from '../crypto/types';
import { useKeyGenStore } from '../store/keygenStore';

interface ColDef {
  id: keyof CoefficientRow;
  header: string;
  subHeader: string;
  width: number;
  group: 'secret' | 'matrix' | 'as' | 'rawt' | 'enc';
}

const COLS: ColDef[] = [
  { id: 'index',    header: 'i',              subHeader: '',                      width: 52,  group: 'matrix' },
  { id: 's0',       header: 's[0][i]',         subHeader: 'CBD · 16-bit storage',  width: 180, group: 'secret' },
  { id: 's1',       header: 's[1][i]',         subHeader: 'CBD · 16-bit storage',  width: 180, group: 'secret' },
  { id: 'a00',      header: 'A[0][0][i]',      subHeader: '16-bit storage',        width: 180, group: 'matrix' },
  { id: 'a01',      header: 'A[0][1][i]',      subHeader: '16-bit storage',        width: 180, group: 'matrix' },
  { id: 'a10',      header: 'A[1][0][i]',      subHeader: '16-bit storage',        width: 180, group: 'matrix' },
  { id: 'a11',      header: 'A[1][1][i]',      subHeader: '16-bit storage',        width: 180, group: 'matrix' },
  { id: 'as0',      header: '(AS)[0][i]',      subHeader: '16-bit storage',        width: 180, group: 'as'     },
  { id: 'as1',      header: '(AS)[1][i]',      subHeader: '16-bit storage',        width: 180, group: 'as'     },
  { id: 't_poly0',  header: 't[0][i] = (AS+e)[0]', subHeader: '16-bit · 512B total',  width: 190, group: 'rawt'   },
  { id: 't_poly1',  header: 't[1][i] = (AS+e)[1]', subHeader: '16-bit · 512B total',  width: 190, group: 'rawt'   },
  { id: 'enc0',     header: 'enc[0][i]',       subHeader: '12-bit · same value · 384B total', width: 210, group: 'enc' },
  { id: 'enc1',     header: 'enc[1][i]',       subHeader: '12-bit · same value · 384B total', width: 210, group: 'enc' },
];

const COL_BYTES: Partial<Record<string, number>> = {
  s0: 2, s1: 2,
  a00: 2, a01: 2, a10: 2, a11: 2,
  as0: 2, as1: 2,
  t_poly0: 2, t_poly1: 2,
  enc0: 1.5, enc1: 1.5,
};

const GROUP_STYLE: Record<ColDef['group'], { bg: string; text: string; border: string }> = {
  secret: { bg: 'bg-emerald-950',  text: 'text-emerald-300', border: 'border-emerald-800' },
  matrix: { bg: 'bg-gray-900',     text: 'text-gray-300',    border: 'border-gray-700'    },
  as:     { bg: 'bg-blue-950',     text: 'text-blue-300',    border: 'border-blue-800'    },
  rawt:   { bg: 'bg-amber-950',    text: 'text-amber-300',   border: 'border-amber-800'   },
  enc:    { bg: 'bg-indigo-950',   text: 'text-cyan-300',    border: 'border-indigo-700'  },
};

const GROUPS: { label: string; ids: string[]; style: ColDef['group'] }[] = [
  { label: 'Index',                                      ids: ['index'],                          style: 'matrix' },
  { label: 'Secret s  (CBD small coefficients)',         ids: ['s0','s1'],                        style: 'secret' },
  { label: 'Matrix A  (uniform random)',                 ids: ['a00','a01','a10','a11'],           style: 'matrix' },
  { label: 'AS = A · s  (intermediate)',                 ids: ['as0','as1'],                      style: 'as'     },
  { label: 't = AS + e  (raw public key · 2×512B = 1024B)', ids: ['t_poly0','t_poly1'],           style: 'rawt'   },
  { label: 'Encoded t  (same value · 12-bit · 2×384B = 768B)', ids: ['enc0','enc1'],             style: 'enc'    },
];

// ── Color helpers ──────────────────────────────────────────────────────────────

function getColor16(v: number) {
  const r = v / 3328;
  if (r < 0.3)  return '#1a4731';
  if (r < 0.6)  return '#3d3010';
  if (r < 0.85) return '#4a2000';
  return '#4a1010';
}

// ── Cell components ────────────────────────────────────────────────────────────

function Cell16({ val }: { val: number }) {
  const bin16 = val.toString(2).padStart(16, '0');
  return (
    <div style={{ backgroundColor: getColor16(val) }} className="rounded px-2 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-gray-300 text-[10px] tracking-tight">{bin16}</div>
      <div className="text-gray-500 text-[9px]">16-bit · 2 bytes</div>
    </div>
  );
}

function CellSmall({ val }: { val: number }) {
  const signed = val > 1664 ? val - 3329 : val;
  const bg = signed < 0 ? '#3a1010' : signed === 0 ? '#111128' : '#0e3010';
  const bin16 = val.toString(2).padStart(16, '0');
  return (
    <div style={{ backgroundColor: bg }} className="rounded px-2 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">
        {val} <span className="text-yellow-300 text-[10px]">({signed >= 0 ? '+' : ''}{signed})</span>
      </div>
      <div className="text-gray-300 text-[10px] tracking-tight">{bin16}</div>
      <div className="text-gray-500 text-[9px]">16-bit · 2 bytes (CBD)</div>
    </div>
  );
}

/** 12-bit encoded cell — value is identical to the raw t value, just in fewer bits */
function Cell12({ val, rawVal }: { val: number; rawVal: number }) {
  const bin12 = val.toString(2).padStart(12, '0');
  const bin16 = rawVal.toString(2).padStart(16, '0');
  const same  = val === rawVal; // always true if encoding is correct
  const r = val / 3328;
  let bg = '#0f1e3a';
  if (r > 0.85) bg = '#3a1020';
  else if (r > 0.6) bg = '#1e0f3a';
  else if (r > 0.3) bg = '#1a2a3a';
  return (
    <div style={{ backgroundColor: bg }} className="rounded px-2 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-cyan-300 text-[10px] tracking-tight">{bin12}</div>
      <div className="text-gray-500 text-[9px]">12-bit · 1.5 bytes</div>
      {/* Show the 4 bits saved vs 16-bit */}
      <div className="text-gray-600 text-[8px] mt-0.5">
        was: <span className="text-gray-500">{bin16.slice(0,4)}</span>
        <span className="text-gray-300">{bin16.slice(4)}</span>
        {same && <span className="text-green-500 ml-1">✓ same value</span>}
      </div>
    </div>
  );
}

function renderCell(col: ColDef, row: CoefficientRow) {
  if (col.id === 'index')    return <div className="font-mono font-bold text-gray-400 text-sm py-1 px-1">{row.index}</div>;
  if (col.group === 'secret') return <CellSmall val={row[col.id] as number} />;
  if (col.group === 'enc') {
    const rawVal = col.id === 'enc0' ? row.t_poly0 : row.t_poly1;
    return <Cell12 val={row[col.id] as number} rawVal={rawVal} />;
  }
  return <Cell16 val={row[col.id] as number} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CoefficientTable() {
  const { rows, filterRange } = useKeyGenStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.t_poly0 >= filterRange[0] && r.t_poly0 <= filterRange[1]),
    [rows, filterRange]
  );

  const colSums = useMemo(() => {
    const out: Record<string, number> = {};
    COLS.forEach((c) => {
      if (c.id !== 'index')
        out[c.id] = rows.reduce((acc, r) => acc + (r[c.id] as number), 0);
    });
    return out;
  }, [rows]);

  const totalWidth = COLS.reduce((s, c) => s + c.width, 0);

  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Click "Generate Keys" to visualize the pipeline
      </div>
    );
  }

  return (
    <div>
      {/* Encoding explanation banner */}
      <div className="mb-2 px-3 py-2 bg-indigo-950 border border-indigo-700 rounded text-xs font-mono">
        <span className="text-cyan-300 font-bold">How 12-bit encoding works: </span>
        <span className="text-gray-300">
          q = 3329 &lt; 2¹² = 4096, so every coefficient fits in 12 bits.
          The number stays the same — only the storage shrinks.
          2450 stored in 16 bits = 2450 stored in 12 bits.
          Each coefficient saves 4 bits → 256 coefficients × 4 bits = 128 bytes per polynomial → 2 polynomials = 256 bytes saved (1024B → 768B).
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs mb-2 px-1">
        {(['secret','matrix','as','rawt','enc'] as ColDef['group'][]).map((g) => (
          <span key={g} className={`flex items-center gap-1 ${GROUP_STYLE[g].text}`}>
            <span className={`inline-block w-3 h-3 rounded ${GROUP_STYLE[g].bg} border ${GROUP_STYLE[g].border}`} />
            {g === 'secret' ? 'Secret s' : g === 'matrix' ? 'Matrix A' : g === 'as' ? 'AS' : g === 'rawt' ? 't = AS+e (raw)' : 'Encoded t (12-bit)'}
          </span>
        ))}
        <span className="text-gray-500 ml-2">← scroll right to see full pipeline →</span>
      </div>

      <div ref={parentRef} className="h-[640px] overflow-auto border border-gray-700 rounded">
        <div style={{ width: totalWidth, minWidth: totalWidth }}>

          {/* Group header row */}
          <div className="flex sticky top-0 z-20 border-b border-gray-600">
            {GROUPS.map((g) => {
              const w = COLS.filter((c) => g.ids.includes(c.id)).reduce((s, c) => s + c.width, 0);
              const st = GROUP_STYLE[g.style];
              return (
                <div key={g.label}
                  className={`flex-shrink-0 px-2 py-1.5 text-center text-xs font-bold border-r ${st.bg} ${st.text} ${st.border}`}
                  style={{ width: w, minWidth: w }}
                >
                  {g.label}
                </div>
              );
            })}
          </div>

          {/* Column header row */}
          <div className="flex sticky top-[34px] z-20 border-b-2 border-gray-600">
            {COLS.map((col) => {
              const st = GROUP_STYLE[col.group];
              return (
                <div key={col.id}
                  className={`flex-shrink-0 px-2 py-2 border-r ${st.bg} ${st.border}`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <div className={`font-semibold text-xs whitespace-nowrap ${st.text}`}>{col.header}</div>
                  {col.subHeader && (
                    <div className="text-gray-500 text-[9px] whitespace-nowrap mt-0.5">{col.subHeader}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Virtual data rows */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = filteredRows[vRow.index];
              return (
                <div key={row.index}
                  className="flex absolute top-0 left-0 w-full border-b border-gray-800 hover:bg-white/5"
                  style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
                >
                  {COLS.map((col) => (
                    <div key={col.id}
                      className="flex-shrink-0 px-1 py-1 border-r border-gray-800 overflow-hidden"
                      style={{ width: col.width, minWidth: col.width, height: vRow.size }}
                    >
                      {renderCell(col, row)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer: column total bytes */}
          <div className="flex sticky bottom-0 z-20 border-t-2 border-blue-600">
            {COLS.map((col) => {
              const bpc    = COL_BYTES[col.id] ?? 0;
              const totalB = bpc * 256;
              const isEnc  = col.group === 'enc';
              const st     = GROUP_STYLE[col.group];
              return (
                <div key={col.id}
                  className={`flex-shrink-0 px-2 py-2 border-r border-gray-800 font-mono ${st.bg}`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.id === 'index' ? (
                    <div className="text-blue-400 font-bold text-xs">TOTAL</div>
                  ) : (
                    <>
                      {totalB > 0 && (
                        <div className={`font-bold text-xs ${isEnc ? 'text-cyan-400' : 'text-blue-300'}`}>
                          {Number.isInteger(totalB) ? totalB : totalB.toFixed(0)}B
                        </div>
                      )}
                      <div className="text-gray-500 text-[9px]">{bpc > 0 ? `${bpc}B × 256` : ''}</div>
                      <div className="text-gray-500 text-[9px]">Σ={colSums[col.id]?.toLocaleString() ?? '—'}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Summary bar */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono px-1">
        <span className="text-gray-400">A: 4×512B = <span className="text-white">2048B</span></span>
        <span className="text-gray-400">AS: 2×512B = <span className="text-white">1024B</span></span>
        <span className="text-amber-300">t = AS+e: 2 × 256 coefficients × 2B = <b>1024B</b> (16-bit)</span>
        <span className="text-cyan-300">enc(t): 2 × 256 coefficients × 1.5B = <b>768B</b> (12-bit, same values)</span>
        <span className="text-green-400">saved: 1024B − 768B = <b>256B</b> (25%)</span>
      </div>

      {/* Live verification for first row */}
      {filteredRows.length > 0 && (
        <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded text-xs font-mono">
          <div className="text-yellow-300 font-bold mb-2">
            Encoding verification — row i=0:
          </div>
          <div className="grid grid-cols-2 gap-6 text-gray-300">
            <div className="space-y-1">
              <div className="text-amber-300 font-bold">t[0][0] = {filteredRows[0].t_poly0}</div>
              <div>16-bit binary: <span className="text-white">{filteredRows[0].t_poly0.toString(2).padStart(16,'0')}</span></div>
              <div>12-bit binary: <span className="text-cyan-300">{filteredRows[0].enc0.toString(2).padStart(12,'0')}</span></div>
              <div>Encoded value: <span className="text-cyan-300 font-bold">{filteredRows[0].enc0}</span>
                {filteredRows[0].enc0 === filteredRows[0].t_poly0
                  ? <span className="text-green-400 ml-2">✓ same number</span>
                  : <span className="text-red-400 ml-2">✗ mismatch</span>}
              </div>
              <div className="text-gray-500 text-[9px]">
                q=3329 &lt; 4096=2¹² → fits in 12 bits, 4 leading bits are always 0
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-amber-300 font-bold">t[1][0] = {filteredRows[0].t_poly1}</div>
              <div>16-bit binary: <span className="text-white">{filteredRows[0].t_poly1.toString(2).padStart(16,'0')}</span></div>
              <div>12-bit binary: <span className="text-cyan-300">{filteredRows[0].enc1.toString(2).padStart(12,'0')}</span></div>
              <div>Encoded value: <span className="text-cyan-300 font-bold">{filteredRows[0].enc1}</span>
                {filteredRows[0].enc1 === filteredRows[0].t_poly1
                  ? <span className="text-green-400 ml-2">✓ same number</span>
                  : <span className="text-red-400 ml-2">✗ mismatch</span>}
              </div>
              <div className="text-gray-500 text-[9px]">
                16-bit has 4 wasted leading zeros → 12-bit removes them
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
