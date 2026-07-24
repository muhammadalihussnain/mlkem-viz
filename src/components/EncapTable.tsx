/**
 * Bob's Encapsulation Pipeline Table
 *
 * Shows all 256 coefficient rows for every stage:
 *   r, e1  →  NTT(Aᵀ), NTT(r)  →  NTT(Aᵀ)·NTT(r)  →  Aᵀr  →  u = Aᵀr+e1  →  encode12(u)
 *   encode(m)  →  tᵀr  →  e2  →  v = tᵀr+e2+encode(m)  →  encode12(v)
 */

import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { EncapRow } from '../crypto/types';
import { useKeyGenStore } from '../store/keygenStore';

interface ColDef {
  id: keyof EncapRow;
  header: string;
  sub: string;
  width: number;
  group: 'r' | 'ntat' | 'ntr' | 'prod' | 'atr' | 'u' | 'uenc' | 'ucomp' | 'msg' | 'v' | 'venc' | 'vcomp';
}

const COLS: ColDef[] = [
  { id: 'index',   header: 'i',                 sub: '',                         width: 52,  group: 'r'    },
  // r
  { id: 'r0',      header: 'r[0][i]',            sub: 'CBD · 16-bit',             width: 165, group: 'r'    },
  { id: 'r1',      header: 'r[1][i]',            sub: 'CBD · 16-bit',             width: 165, group: 'r'    },
  // e1
  { id: 'e1_0',    header: 'e1[0][i]',           sub: 'CBD · 16-bit',             width: 165, group: 'r'    },
  { id: 'e1_1',    header: 'e1[1][i]',           sub: 'CBD · 16-bit',             width: 165, group: 'r'    },
  // NTT(Aᵀ)
  { id: 'nttAt00', header: 'NTT(Aᵀ)[0][0][i]',  sub: '16-bit',                   width: 178, group: 'ntat' },
  { id: 'nttAt01', header: 'NTT(Aᵀ)[0][1][i]',  sub: '16-bit',                   width: 178, group: 'ntat' },
  { id: 'nttAt10', header: 'NTT(Aᵀ)[1][0][i]',  sub: '16-bit',                   width: 178, group: 'ntat' },
  { id: 'nttAt11', header: 'NTT(Aᵀ)[1][1][i]',  sub: '16-bit',                   width: 178, group: 'ntat' },
  // NTT(r)
  { id: 'nttR0',   header: 'NTT(r[0])[i]',      sub: '16-bit',                   width: 170, group: 'ntr'  },
  { id: 'nttR1',   header: 'NTT(r[1])[i]',      sub: '16-bit',                   width: 170, group: 'ntr'  },
  // NTT(Aᵀ)·NTT(r)
  { id: 'nttAtR0', header: '(NTT(Aᵀ)·NTT(r))[0][i]', sub: 'pointwise · row 0 term 0', width: 205, group: 'prod' },
  { id: 'nttAtR1', header: '(NTT(Aᵀ)·NTT(r))[0][i]', sub: 'pointwise · row 0 term 1', width: 205, group: 'prod' },
  // Aᵀr = INTT(·)
  { id: 'atR0',    header: 'Aᵀr[0][i]',         sub: 'INTT(·) · 16-bit',         width: 175, group: 'atr'  },
  { id: 'atR1',    header: 'Aᵀr[1][i]',         sub: 'INTT(·) · 16-bit',         width: 175, group: 'atr'  },
  // u = Aᵀr + e1
  { id: 'u0',      header: 'u[0][i] = Aᵀr+e1',  sub: '16-bit · 512B',            width: 185, group: 'u'    },
  { id: 'u1',      header: 'u[1][i] = Aᵀr+e1',  sub: '16-bit · 512B',            width: 185, group: 'u'    },
  // encode12(u)
  { id: 'uEnc0',   header: 'enc12(u[0])[i]',    sub: '12-bit · 384B',            width: 185, group: 'uenc' },
  { id: 'uEnc1',   header: 'enc12(u[1])[i]',    sub: '12-bit · 384B',            width: 185, group: 'uenc' },
  // Compress(u, 10)
  { id: 'uComp0',  header: 'Compress(u[0],10)[i]', sub: '10-bit · round(u·2¹⁰/q) · 320B', width: 210, group: 'ucomp' },
  { id: 'uComp1',  header: 'Compress(u[1],10)[i]', sub: '10-bit · round(u·2¹⁰/q) · 320B', width: 210, group: 'ucomp' },
  // message
  { id: 'encM',    header: 'encode(m)[i]',       sub: '0 or 1664 · 1-bit src',    width: 175, group: 'msg'  },
  // tᵀr
  { id: 'tTR',     header: 'tᵀr[i]',            sub: 'Σ t[k]·r[k] · 16-bit',    width: 175, group: 'v'    },
  // e2
  { id: 'e2',      header: 'e2[i]',              sub: 'CBD scalar · 16-bit',      width: 165, group: 'v'    },
  // v
  { id: 'v',       header: 'v[i] = tᵀr+e2+m',  sub: '16-bit · 512B',            width: 195, group: 'v'    },
  // encode12(v)
  { id: 'vEnc',    header: 'enc12(v)[i]',        sub: '12-bit · 384B',            width: 185, group: 'venc' },
  // Compress(v, 4)
  { id: 'vComp',   header: 'Compress(v,4)[i]',   sub: '4-bit · round(v·2⁴/q) · 128B', width: 195, group: 'vcomp' },
];

const COL_BYTES: Partial<Record<string, number>> = {
  r0: 2, r1: 2, e1_0: 2, e1_1: 2,
  nttAt00: 2, nttAt01: 2, nttAt10: 2, nttAt11: 2,
  nttR0: 2, nttR1: 2,
  nttAtR0: 2, nttAtR1: 2,
  atR0: 2, atR1: 2,
  u0: 2, u1: 2,
  uEnc0: 1.5, uEnc1: 1.5,
  uComp0: 1.25, uComp1: 1.25, // 10-bit = 320B per poly
  encM: 2, tTR: 2, e2: 2, v: 2,
  vEnc: 1.5,
  vComp: 0.5, // 4-bit = 128B
};

type Group = ColDef['group'];
const GS: Record<Group, { bg: string; text: string; border: string }> = {
  r:      { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-800' },
  ntat:   { bg: 'bg-violet-950',  text: 'text-violet-300',  border: 'border-violet-700'  },
  ntr:    { bg: 'bg-fuchsia-950', text: 'text-fuchsia-300', border: 'border-fuchsia-700' },
  prod:   { bg: 'bg-rose-950',    text: 'text-rose-300',    border: 'border-rose-700'    },
  atr:    { bg: 'bg-blue-950',    text: 'text-blue-300',    border: 'border-blue-800'    },
  u:      { bg: 'bg-amber-950',   text: 'text-amber-300',   border: 'border-amber-800'   },
  uenc:   { bg: 'bg-indigo-950',  text: 'text-cyan-300',    border: 'border-indigo-700'  },
  ucomp:  { bg: 'bg-sky-950',     text: 'text-sky-200',     border: 'border-sky-600'     },
  msg:    { bg: 'bg-teal-950',    text: 'text-teal-300',    border: 'border-teal-700'    },
  v:      { bg: 'bg-orange-950',  text: 'text-orange-300',  border: 'border-orange-700'  },
  venc:   { bg: 'bg-sky-950',     text: 'text-sky-300',     border: 'border-sky-700'     },
  vcomp:  { bg: 'bg-pink-950',    text: 'text-pink-300',    border: 'border-pink-700'    },
};

const GROUPS: { label: string; ids: string[]; g: Group }[] = [
  { label: 'i',                                         ids: ['index'],                                  g: 'r'     },
  { label: "Bob's r + e1  (CBD random)",               ids: ['r0','r1','e1_0','e1_1'],                 g: 'r'     },
  { label: 'NTT(Aᵀ)  (transpose of Alice NTT(A))',    ids: ['nttAt00','nttAt01','nttAt10','nttAt11'],  g: 'ntat'  },
  { label: 'NTT(r)',                                    ids: ['nttR0','nttR1'],                          g: 'ntr'   },
  { label: 'NTT(Aᵀ)·NTT(r)  pointwise',               ids: ['nttAtR0','nttAtR1'],                      g: 'prod'  },
  { label: 'Aᵀr = INTT(·)',                            ids: ['atR0','atR1'],                            g: 'atr'   },
  { label: 'u = Aᵀr + e1  (1024B raw)',               ids: ['u0','u1'],                                g: 'u'     },
  { label: 'enc₁₂(u)  (768B · 12-bit)',                ids: ['uEnc0','uEnc1'],                          g: 'uenc'  },
  { label: 'Compress(u,10)  (640B · 10-bit)',          ids: ['uComp0','uComp1'],                        g: 'ucomp' },
  { label: 'encode(m)  shared secret',                 ids: ['encM'],                                   g: 'msg'   },
  { label: 'v = tᵀr + e2 + encode(m)  (512B raw)',   ids: ['tTR','e2','v'],                           g: 'v'     },
  { label: 'enc₁₂(v)  (384B · 12-bit)',                ids: ['vEnc'],                                   g: 'venc'  },
  { label: 'Compress(v,4)  (128B · 4-bit)',            ids: ['vComp'],                                  g: 'vcomp' },
];

// ── Cell renderers ─────────────────────────────────────────────────────────────

function getColor16(v: number) {
  const r = Math.abs(v) / 3328;
  if (r < 0.3)  return '#1a4731';
  if (r < 0.6)  return '#3d3010';
  if (r < 0.85) return '#4a2000';
  return '#4a1010';
}

function Cell16({ val }: { val: number }) {
  const signed = val > 1664 ? val - 3329 : val;
  return (
    <div style={{ backgroundColor: getColor16(val) }} className="rounded px-1.5 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-gray-300 text-[10px] tracking-tight">{val.toString(2).padStart(16,'0')}</div>
      <div className="text-gray-500 text-[8px]">
        16-bit · 2B{Math.abs(signed) <= 3 ? ` (${signed>=0?'+':''}${signed})` : ''}
      </div>
    </div>
  );
}

function Cell12({ val }: { val: number }) {
  return (
    <div className="bg-indigo-950 rounded px-1.5 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-cyan-300 text-[10px] tracking-tight">{val.toString(2).padStart(12,'0')}</div>
      <div className="text-gray-500 text-[8px]">12-bit · 1.5B</div>
    </div>
  );
}

/** Compress(x, 10): 10-bit output in [0, 1023] */
function Cell10({ val }: { val: number }) {
  return (
    <div className="bg-sky-950 rounded px-1.5 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-sky-200 text-[10px] tracking-tight">{val.toString(2).padStart(10,'0')}</div>
      <div className="text-gray-500 text-[8px]">10-bit · 1.25B</div>
    </div>
  );
}

/** Compress(x, 4): 4-bit output in [0, 15] */
function Cell4({ val }: { val: number }) {
  return (
    <div className="bg-pink-950 rounded px-1.5 py-1 font-mono leading-snug h-full">
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-pink-300 text-[10px] tracking-tight">{val.toString(2).padStart(4,'0')}</div>
      <div className="text-gray-500 text-[8px]">4-bit · 0.5B</div>
    </div>
  );
}

function CellMsg({ val }: { val: number }) {
  const bit = val > 0 ? 1 : 0;
  return (
    <div className={`rounded px-1.5 py-1 font-mono leading-snug h-full ${bit ? 'bg-teal-900' : 'bg-teal-950'}`}>
      <div className="text-white font-bold text-sm">{val}</div>
      <div className="text-teal-300 text-[10px] tracking-tight">{val.toString(2).padStart(12,'0')}</div>
      <div className="text-teal-400 text-[8px]">bit={bit} · 0 or 1664</div>
    </div>
  );
}

function renderCell(col: ColDef, row: EncapRow) {
  if (col.id === 'index')  return <div className="font-mono font-bold text-gray-400 text-sm px-1">{row.index}</div>;
  if (col.group === 'ucomp') return <Cell10 val={row[col.id] as number} />;
  if (col.group === 'vcomp') return <Cell4  val={row[col.id] as number} />;
  if (col.group === 'uenc' || col.group === 'venc') return <Cell12 val={row[col.id] as number} />;
  if (col.id === 'encM')   return <CellMsg val={row.encM} />;
  return <Cell16 val={row[col.id] as number} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EncapTable() {
  const { encapRows } = useKeyGenStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const colSums = useMemo(() => {
    const out: Record<string, number> = {};
    COLS.forEach(c => {
      if (c.id !== 'index')
        out[c.id] = encapRows.reduce((acc, r) => acc + (r[c.id] as number), 0);
    });
    return out;
  }, [encapRows]);

  const totalWidth = COLS.reduce((s, c) => s + c.width, 0);

  const virtualizer = useVirtualizer({
    count: encapRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  });

  if (encapRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Click "Encapsulate (Bob)" after generating keys
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] mb-2 px-1">
        {(Object.entries(GS) as [Group, typeof GS[Group]][]).map(([g, st]) => (
          <span key={g} className={`flex items-center gap-1 ${st.text}`}>
            <span className={`inline-block w-3 h-3 rounded ${st.bg} border ${st.border}`} />
            {g === 'r' ? 'r/e1' : g === 'ntat' ? 'NTT(Aᵀ)' : g === 'ntr' ? 'NTT(r)'
              : g === 'prod' ? 'prod' : g === 'atr' ? 'Aᵀr'
              : g === 'u' ? 'u' : g === 'uenc' ? 'enc₁₂(u)'
              : g === 'ucomp' ? 'Compress(u,10)'
              : g === 'msg' ? 'm' : g === 'v' ? 'v'
              : g === 'venc' ? 'enc₁₂(v)' : 'Compress(v,4)'}
          </span>
        ))}
        <span className="text-gray-500 ml-2">← scroll right →</span>
      </div>

      <div ref={parentRef} className="h-[640px] overflow-auto border border-gray-700 rounded">
        <div style={{ width: totalWidth, minWidth: totalWidth }}>

          {/* Group header */}
          <div className="flex sticky top-0 z-20 border-b border-gray-600">
            {GROUPS.map(g => {
              const w = COLS.filter(c => g.ids.includes(c.id)).reduce((s, c) => s + c.width, 0);
              const st = GS[g.g];
              return (
                <div key={g.label} className={`flex-shrink-0 px-2 py-1.5 text-center text-xs font-bold border-r ${st.bg} ${st.text} ${st.border}`}
                  style={{ width: w, minWidth: w }}>
                  {g.label}
                </div>
              );
            })}
          </div>

          {/* Column headers */}
          <div className="flex sticky top-[34px] z-20 border-b-2 border-gray-600">
            {COLS.map(col => {
              const st = GS[col.group];
              return (
                <div key={col.id} className={`flex-shrink-0 px-2 py-2 border-r ${st.bg} ${st.border}`}
                  style={{ width: col.width, minWidth: col.width }}>
                  <div className={`font-semibold text-xs whitespace-nowrap ${st.text}`}>{col.header}</div>
                  {col.sub && <div className="text-gray-500 text-[9px] whitespace-nowrap mt-0.5">{col.sub}</div>}
                </div>
              );
            })}
          </div>

          {/* Virtual rows */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(vRow => {
              const row = encapRows[vRow.index];
              return (
                <div key={row.index}
                  className="flex absolute top-0 left-0 w-full border-b border-gray-800 hover:bg-white/5"
                  style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}>
                  {COLS.map(col => (
                    <div key={col.id}
                      className="flex-shrink-0 px-1 py-1 border-r border-gray-800 overflow-hidden"
                      style={{ width: col.width, minWidth: col.width, height: vRow.size }}>
                      {renderCell(col, row)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer totals */}
          <div className="flex sticky bottom-0 z-20 border-t-2 border-blue-600">
            {COLS.map(col => {
              const bpc = COL_BYTES[col.id] ?? 0;
              const totalB = bpc * 256;
              const isEnc = col.group === 'uenc' || col.group === 'venc';
              const st = GS[col.group];
              return (
                <div key={col.id}
                  className={`flex-shrink-0 px-2 py-2 border-r border-gray-800 font-mono ${st.bg}`}
                  style={{ width: col.width, minWidth: col.width }}>
                  {col.id === 'index' ? (
                    <div className="text-blue-400 font-bold text-xs">TOTAL</div>
                  ) : (
                    <>
                      {totalB > 0 && (
                        <div className={`font-bold text-xs ${isEnc ? 'text-cyan-400' : 'text-blue-300'}`}>
                          {Number.isInteger(totalB) ? totalB : totalB.toFixed(0)}B
                        </div>
                      )}
                      <div className="text-gray-500 text-[9px]">{bpc > 0 ? `${bpc}B×256` : ''}</div>
                      <div className="text-gray-500 text-[9px]">
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

      {/* Ciphertext size summary */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono px-1">
        <span className="text-amber-300">u: 2×512B = <b>1024B</b> raw (16-bit)</span>
        <span className="text-cyan-300">enc₁₂(u): 2×384B = <b>768B</b></span>
        <span className="text-sky-300">Compress(u,10): 2×320B = <b>640B</b></span>
        <span className="text-orange-300">v: 1×512B = <b>512B</b> raw (16-bit)</span>
        <span className="text-sky-300">enc₁₂(v): 1×384B = <b>384B</b></span>
        <span className="text-pink-300">Compress(v,4): 1×128B = <b>128B</b></span>
        <span className="text-green-300 font-bold">ciphertext = Compress(u,10) + Compress(v,4) = 640 + 128 = <b>768B</b></span>
      </div>
    </div>
  );
}
