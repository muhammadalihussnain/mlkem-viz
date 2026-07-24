/**
 * ML-KEM-512 coefficient pipeline table.
 * Uses div-based layout so virtual rows (display:flex) align with headers.
 */

import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CoefficientRow } from '../crypto/types';
import { useKeyGenStore } from '../store/keygenStore';

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef {
  id: keyof CoefficientRow;
  header: string;
  subHeader: string;  // bit-width label shown under main header
  width: number;      // px
  group: 'secret' | 'matrix' | 'as' | 'rawt' | 'enc';
}

const COLS: ColDef[] = [
  { id: 'index',   header: 'i',               subHeader: '',              width: 48,  group: 'matrix' },
  { id: 's0',      header: 's[0][i]',          subHeader: '16-bit · CBD',  width: 168, group: 'secret' },
  { id: 's1',      header: 's[1][i]',          subHeader: '16-bit · CBD',  width: 168, group: 'secret' },
  { id: 'a00',     header: 'A[0][0][i]',       subHeader: '16-bit',        width: 168, group: 'matrix' },
  { id: 'a01',     header: 'A[0][1][i]',       subHeader: '16-bit',        width: 168, group: 'matrix' },
  { id: 'a10',     header: 'A[1][0][i]',       subHeader: '16-bit',        width: 168, group: 'matrix' },
  { id: 'a11',     header: 'A[1][1][i]',       subHeader: '16-bit',        width: 168, group: 'matrix' },
  { id: 'as0',     header: '(AS)[0][i]',       subHeader: '16-bit',        width: 168, group: 'as'     },
  { id: 'as1',     header: '(AS)[1][i]',       subHeader: '16-bit',        width: 168, group: 'as'     },
  { id: 't_poly0', header: 't[0][i] = AS+e',   subHeader: '16-bit · raw',  width: 178, group: 'rawt'   },
  { id: 't_poly1', header: 't[1][i] = AS+e',   subHeader: '16-bit · raw',  width: 178, group: 'rawt'   },
  { id: 't1_p0',   header: 't1[0][i]',         subHeader: '(t[0]+2¹⁰)>>11 · 12-bit', width: 188, group: 'enc' },
  { id: 't0_p0',   header: 't0[0][i]',         subHeader: 't[0]−t1·2¹¹+2¹⁰ · 12-bit', width: 200, group: 'enc' },
  { id: 't1_p1',   header: 't1[1][i]',         subHeader: '(t[1]+2¹⁰)>>11 · 12-bit', width: 188, group: 'enc' },
  { id: 't0_p1',   header: 't0[1][i]',         subHeader: 't[1]−t1·2¹¹+2¹⁰ · 12-bit', width: 200, group: 'enc' },
];

// Bytes per coefficient per column
const COL_BYTES: Partial<Record<string, number>> = {
  s0: 2, s1: 2,
  a00: 2, a01: 2, a10: 2, a11: 2,
  as0: 2, as1: 2,
  t_poly0: 2, t_poly1: 2,
  t1_p0: 1.5, t0_p0: 1.5,
  t1_p1: 1.5, t0_p1: 1.5,
};

const GROUP_STYLE: Record<ColDef['group'], { bg: string; text: string; border: string }> = {
  secret: { bg: 'bg-emerald-950',  text: 'text-emerald-300', border: 'border-emerald-800' },
  matrix: { bg: 'bg-gray-900',     text: 'text-gray-300',    border: 'border-gray-700'    },
  as:     { bg: 'bg-blue-950',     text: 'text-blue-300',    border: 'border-blue-800'    },
  rawt:   { bg: 'bg-amber-950',    text: 'text-amber-300',   border: 'border-amber-800'   },
  enc:    { bg: 'bg-indigo-950',   text: 'text-cyan-300',    border: 'border-indigo-700'  },
};

// ── Cell renderers ─────────────────────────────────────────────────────────────

function getColor16(v: number) {
  const r = v / 3328;
  if (r < 0.3)  return '#1a4731';
  if (r < 0.6)  return '#3d3010';
  if (r < 0.85) return '#4a2000';
  return '#4a1010';
}

function getColor12(v: number) {
  const r = Math.abs(v) / 4095;
  if (r < 0.3)  return '#0f1e3a';
  if (r < 0.6)  return '#1e0f3a';
  if (r < 0.85) return '#2e1030';
  return '#3a1020';
}

function Cell16({ val }: { val: number }) {
  return (
    <div style={{ backgroundColor: getColor16(val) }} className="rounded px-1 py-0.5 font-mono leading-tight h-full">
      <div className="text-white font-semibold text-xs">{val}</div>
      <div className="text-gray-300 text-[9px] tracking-tight">{val.toString(2).padStart(16, '0')}</div>
      <div className="text-gray-500 text-[8px]">2 bytes</div>
    </div>
  );
}

function CellSmall({ val }: { val: number }) {
  const signed = val > 1664 ? val - 3329 : val;
  const bg = signed < 0 ? '#3a1010' : signed === 0 ? '#111128' : '#0e3010';
  return (
    <div style={{ backgroundColor: bg }} className="rounded px-1 py-0.5 font-mono leading-tight h-full">
      <div className="text-white font-semibold text-xs">
        {val} <span className="text-yellow-300 text-[9px]">({signed >= 0 ? '+' : ''}{signed})</span>
      </div>
      <div className="text-gray-300 text-[9px] tracking-tight">{val.toString(2).padStart(16, '0')}</div>
      <div className="text-gray-500 text-[8px]">2 bytes (CBD)</div>
    </div>
  );
}

function Cell12({ val }: { val: number }) {
  return (
    <div style={{ backgroundColor: getColor12(val) }} className="rounded px-1 py-0.5 font-mono leading-tight h-full">
      <div className="text-white font-semibold text-xs">{val}</div>
      <div className="text-gray-300 text-[9px] tracking-tight">{val.toString(2).padStart(12, '0')}</div>
      <div className="text-gray-500 text-[8px]">1.5 bytes</div>
    </div>
  );
}

function renderCell(col: ColDef, row: CoefficientRow) {
  if (col.id === 'index') return <div className="font-mono font-bold text-gray-400 text-xs">{row.index}</div>;
  if (col.group === 'secret') return <CellSmall val={row[col.id] as number} />;
  if (col.group === 'enc')    return <Cell12    val={row[col.id] as number} />;
  return <Cell16 val={row[col.id] as number} />;
}

// ── Group spans for the top group header row ───────────────────────────────────

const GROUPS: { label: string; ids: string[]; style: ColDef['group'] }[] = [
  { label: 'Index',              ids: ['index'],                         style: 'matrix' },
  { label: 'Secret s (CBD)',     ids: ['s0','s1'],                       style: 'secret' },
  { label: 'Matrix A',           ids: ['a00','a01','a10','a11'],         style: 'matrix' },
  { label: 'AS = A·s',           ids: ['as0','as1'],                     style: 'as'     },
  { label: 't = AS+e  (raw 16-bit · 1024 B)', ids: ['t_poly0','t_poly1'], style: 'rawt' },
  { label: 'Compressed t[0]  (12-bit · 768 B total for t[0]+t[1])', ids: ['t1_p0','t0_p0'], style: 'enc' },
  { label: 'Compressed t[1]',    ids: ['t1_p1','t0_p1'],                 style: 'enc'    },
];

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
    estimateSize: () => 72,
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
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] mb-2 px-1">
        {(['secret','matrix','as','rawt','enc'] as ColDef['group'][]).map((g) => (
          <span key={g} className={`flex items-center gap-1 ${GROUP_STYLE[g].text}`}>
            <span className={`inline-block w-3 h-3 rounded ${GROUP_STYLE[g].bg} border ${GROUP_STYLE[g].border}`} />
            {g === 'secret' ? 'Secret s' : g === 'matrix' ? 'Matrix A' : g === 'as' ? 'AS' : g === 'rawt' ? 't=AS+e (raw)' : 'Compressed (12-bit)'}
          </span>
        ))}
        <span className="text-gray-500 ml-2">← scroll right to see full pipeline →</span>
      </div>

      {/* Scrollable container */}
      <div ref={parentRef} className="h-[640px] overflow-auto border border-gray-700 rounded">
        <div style={{ width: totalWidth, minWidth: totalWidth }}>

          {/* ── Group header row ── */}
          <div className="flex sticky top-0 z-20 border-b border-gray-600">
            {GROUPS.map((g) => {
              const w = COLS.filter((c) => g.ids.includes(c.id)).reduce((s, c) => s + c.width, 0);
              const st = GROUP_STYLE[g.style];
              return (
                <div
                  key={g.label}
                  className={`flex-shrink-0 px-2 py-1 text-center text-[10px] font-bold border-r ${st.bg} ${st.text} ${st.border}`}
                  style={{ width: w, minWidth: w }}
                >
                  {g.label}
                </div>
              );
            })}
          </div>

          {/* ── Column header row ── */}
          <div className="flex sticky top-[28px] z-20 border-b-2 border-gray-600">
            {COLS.map((col) => {
              const st = GROUP_STYLE[col.group];
              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 px-2 py-1.5 border-r ${st.bg} ${st.border}`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <div className={`font-semibold text-[10px] whitespace-nowrap ${st.text}`}>
                    {col.header}
                  </div>
                  {col.subHeader && (
                    <div className="text-gray-500 text-[8px] whitespace-nowrap mt-0.5">
                      {col.subHeader}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Virtual data rows ── */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = filteredRows[vRow.index];
              return (
                <div
                  key={row.index}
                  className="flex absolute top-0 left-0 w-full border-b border-gray-800 hover:bg-white/5"
                  style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
                >
                  {COLS.map((col) => (
                    <div
                      key={col.id}
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

          {/* ── Footer: column totals ── */}
          <div className="flex sticky bottom-0 z-20 border-t-2 border-blue-600">
            {COLS.map((col) => {
              const bpc   = COL_BYTES[col.id] ?? 0;
              const totalB = bpc * 256;
              const isEnc  = col.group === 'enc';
              const st     = GROUP_STYLE[col.group];
              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 px-2 py-1 border-r border-gray-800 text-[9px] font-mono ${st.bg}`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.id === 'index' ? (
                    <div className="text-blue-400 font-bold">TOTAL</div>
                  ) : (
                    <>
                      {totalB > 0 && (
                        <div className={`font-bold ${isEnc ? 'text-cyan-400' : 'text-blue-300'}`}>
                          {Number.isInteger(totalB) ? totalB : (totalB).toFixed(0)}B
                        </div>
                      )}
                      <div className="text-gray-600 text-[8px]">
                        {bpc > 0 ? `${bpc}B×256` : ''}
                      </div>
                      <div className="text-gray-500 text-[8px]">
                        Σ={colSums[col.id]?.toLocaleString() ?? '—'}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Summary bar */}
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-mono px-1">
        <span className="text-gray-400">s: 2×512B=<span className="text-white">1024B</span></span>
        <span className="text-gray-400">A: 4×512B=<span className="text-white">2048B</span></span>
        <span className="text-gray-400">AS: 2×512B=<span className="text-white">1024B</span></span>
        <span className="text-amber-300">t=AS+e: 2×512B=1024B (raw 16-bit)</span>
        <span className="text-cyan-300">t1[0]+t0[0]+t1[1]+t0[1]: 4×384B=<b>768B</b> (12-bit compressed)</span>
        <span className="text-green-400">saving: 1024B→768B = 25%</span>
      </div>
    </div>
  );
}
