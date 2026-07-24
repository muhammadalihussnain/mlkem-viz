/**
 * ML-KEM-512 coefficient pipeline table.
 *
 * Pipeline stages (left → right):
 *   s[0], s[1]          — secret vector  (CBD small, 16-bit storage)
 *   A[0][0..1][1..0]    — matrix A       (uniform random, 16-bit)
 *   AS[0], AS[1]        — matrix-vector product (16-bit)
 *   t[0], t[1]          — AS + e, raw public key (16-bit, 2×512B = 1024B)
 *   t1[0], t0[0]        — compressed poly-0: (t[0]+2^10)>>11 and remainder (12-bit each, 2×384B)
 *   t1[1], t0[1]        — compressed poly-1: same split                    (12-bit each, 2×384B)
 *                                                        ↑ total encoded = 768B
 */

import { useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CoefficientRow } from '../crypto/types';
import { useKeyGenStore } from '../store/keygenStore';

const columnHelper = createColumnHelper<CoefficientRow>();

function getColor16(val: number) {
  const r = val / 3328;
  if (r < 0.3) return '#1a4731';
  if (r < 0.6) return '#3d3010';
  if (r < 0.85) return '#4a2000';
  return '#4a1010';
}

function getColor12(val: number) {
  // t1 values are 0-2; t0 values can be large — use 4095 as max
  const r = Math.abs(val) / 4095;
  if (r < 0.3) return '#1a2a4a';
  if (r < 0.6) return '#2a1a4a';
  if (r < 0.85) return '#3a1a3a';
  return '#4a1a2a';
}

/** 16-bit standard coefficient cell */
function Cell16({ val }: { val: number }) {
  return (
    <div
      style={{ backgroundColor: getColor16(val) }}
      className="rounded px-1 py-0.5 font-mono text-xs leading-tight"
    >
      <div className="text-white font-semibold">{val}</div>
      <div className="text-gray-300 text-[9px] tracking-tight">
        {val.toString(2).padStart(16, '0')}
      </div>
      <div className="text-gray-400 text-[8px]">16-bit · 2 B</div>
    </div>
  );
}

/** CBD small-coefficient cell — shows signed representation */
function CellSmall({ val }: { val: number }) {
  const signed = val > 1664 ? val - 3329 : val;
  const bg = signed < 0 ? '#3a1010' : signed === 0 ? '#1a1a2e' : '#103a10';
  return (
    <div
      style={{ backgroundColor: bg }}
      className="rounded px-1 py-0.5 font-mono text-xs leading-tight"
    >
      <div className="text-white font-semibold">
        {val}{' '}
        <span className="text-yellow-300 text-[9px]">
          ({signed >= 0 ? '+' : ''}{signed})
        </span>
      </div>
      <div className="text-gray-300 text-[9px] tracking-tight">
        {val.toString(2).padStart(16, '0')}
      </div>
      <div className="text-gray-400 text-[8px]">16-bit · 2 B (CBD)</div>
    </div>
  );
}

/**
 * 12-bit compressed coefficient cell.
 * label: formula shown as subtitle.
 */
function Cell12({ val, formula }: { val: number; formula: string }) {
  return (
    <div
      style={{ backgroundColor: getColor12(val) }}
      className="rounded px-1 py-0.5 font-mono text-xs leading-tight"
    >
      <div className="text-[8px] text-cyan-400 mb-0.5">{formula}</div>
      <div className="text-white font-semibold">{val}</div>
      <div className="text-gray-300 text-[9px] tracking-tight">
        {val.toString(2).padStart(12, '0')}
      </div>
      <div className="text-gray-400 text-[8px]">12-bit · 1.5 B</div>
    </div>
  );
}

// Bytes per coefficient for each column (× 256 = column total)
const COL_BYTES: Partial<Record<keyof CoefficientRow | string, number>> = {
  s0: 2, s1: 2,
  a00: 2, a01: 2, a10: 2, a11: 2,
  as0: 2, as1: 2,
  t_poly0: 2, t_poly1: 2,
  t1_p0: 1.5, t0_p0: 1.5,
  t1_p1: 1.5, t0_p1: 1.5,
};

// Human label for each group separator
const GROUP_LABELS: Record<string, string> = {
  s0:     '── Secret s ──',
  a00:    '── Matrix A ──',
  as0:    '── AS = A·s ──',
  t_poly0:'── t = AS+e (raw, 16-bit) ──',
  t1_p0:  '── Compressed t[0]: (t[0]+2¹⁰)>>11 split ──',
  t1_p1:  '── Compressed t[1]: (t[1]+2¹⁰)>>11 split ──',
};

export function CoefficientTable() {
  const { rows, filterRange } = useKeyGenStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.t_poly0 >= filterRange[0] && r.t_poly0 <= filterRange[1]),
    [rows, filterRange]
  );

  // Sum of all values per column (for footer)
  const colSums = useMemo(() => {
    const sum = (key: keyof CoefficientRow) =>
      rows.reduce((acc, r) => acc + (r[key] as number), 0);
    return {
      s0: sum('s0'), s1: sum('s1'),
      a00: sum('a00'), a01: sum('a01'), a10: sum('a10'), a11: sum('a11'),
      as0: sum('as0'), as1: sum('as1'),
      t_poly0: sum('t_poly0'), t_poly1: sum('t_poly1'),
      t1_p0: sum('t1_p0'), t0_p0: sum('t0_p0'),
      t1_p1: sum('t1_p1'), t0_p1: sum('t0_p1'),
    };
  }, [rows]);

  const columns = useMemo(() => [
    columnHelper.accessor('index', {
      header: 'i',
      cell: (info) => (
        <div className="font-mono font-bold text-gray-300 text-xs">{info.getValue()}</div>
      ),
      size: 45,
    }),

    // ── Secret vector ──────────────────────────────────
    columnHelper.accessor('s0', {
      header: 's[0][i]  ·  16-bit',
      cell: (info) => <CellSmall val={info.getValue()} />,
      size: 165,
    }),
    columnHelper.accessor('s1', {
      header: 's[1][i]  ·  16-bit',
      cell: (info) => <CellSmall val={info.getValue()} />,
      size: 165,
    }),

    // ── Matrix A ───────────────────────────────────────
    columnHelper.accessor('a00', {
      header: 'A[0][0][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),
    columnHelper.accessor('a01', {
      header: 'A[0][1][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),
    columnHelper.accessor('a10', {
      header: 'A[1][0][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),
    columnHelper.accessor('a11', {
      header: 'A[1][1][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),

    // ── AS intermediate ────────────────────────────────
    columnHelper.accessor('as0', {
      header: '(AS)[0][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),
    columnHelper.accessor('as1', {
      header: '(AS)[1][i]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 165,
    }),

    // ── t = AS + e  (raw, no compression yet) ─────────
    columnHelper.accessor('t_poly0', {
      header: 't[0][i] = (AS+e)[0]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 185,
    }),
    columnHelper.accessor('t_poly1', {
      header: 't[1][i] = (AS+e)[1]  ·  16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 185,
    }),

    // ── Compressed t[0] — 4 independent 12-bit columns ─
    columnHelper.accessor('t1_p0', {
      header: 't1[0][i] = (t[0]+2¹⁰)>>11  ·  12-bit',
      cell: (info) => (
        <Cell12 val={info.getValue()} formula="(t[0]+2¹⁰)>>11" />
      ),
      size: 195,
    }),
    columnHelper.accessor('t0_p0', {
      header: 't0[0][i] = t[0]−t1·2¹¹+2¹⁰  ·  12-bit',
      cell: (info) => (
        <Cell12 val={info.getValue()} formula="t[0]−t1·2¹¹+2¹⁰" />
      ),
      size: 210,
    }),

    // ── Compressed t[1] ────────────────────────────────
    columnHelper.accessor('t1_p1', {
      header: 't1[1][i] = (t[1]+2¹⁰)>>11  ·  12-bit',
      cell: (info) => (
        <Cell12 val={info.getValue()} formula="(t[1]+2¹⁰)>>11" />
      ),
      size: 195,
    }),
    columnHelper.accessor('t0_p1', {
      header: 't0[1][i] = t[1]−t1·2¹¹+2¹⁰  ·  12-bit',
      cell: (info) => (
        <Cell12 val={info.getValue()} formula="t[1]−t1·2¹¹+2¹⁰" />
      ),
      size: 210,
    }),
  ], []);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
        Click "Generate Keys" to visualize the pipeline
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-2 px-1">
        {([['#1a4731','0–30%'],['#3d3010','30–60%'],['#4a2000','60–85%'],['#4a1010','85–100%']] as [string,string][]).map(
          ([c, l]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: c }} />
              {l}
            </span>
          )
        )}
        <span className="text-gray-500 ml-3">← Scroll horizontally to see full pipeline →</span>
      </div>

      {/* Group header bar */}
      <div className="flex text-[9px] font-bold mb-1 overflow-hidden">
        {Object.entries(GROUP_LABELS).map(([id, label]) => (
          <div key={id} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded mr-1 whitespace-nowrap">
            {label}
          </div>
        ))}
      </div>

      <div
        ref={parentRef}
        className="h-[640px] overflow-auto border border-gray-700 rounded"
      >
        <table className="text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-gray-900 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-700">
                {hg.headers.map((header) => {
                  const isEncoded = ['t1_p0','t0_p0','t1_p1','t0_p1'].includes(header.column.id);
                  const isRawT   = ['t_poly0','t_poly1'].includes(header.column.id);
                  return (
                    <th
                      key={header.id}
                      className={[
                        'px-2 py-2 text-left font-semibold whitespace-nowrap border-r text-[10px]',
                        isEncoded
                          ? 'bg-indigo-950 text-cyan-300 border-indigo-700'
                          : isRawT
                          ? 'bg-gray-800 text-yellow-300 border-gray-700'
                          : 'bg-gray-900 text-gray-300 border-gray-800',
                      ].join(' ')}
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = tableRows[vRow.index];
              return (
                <tr
                  key={row.id}
                  className="hover:bg-gray-800/40 border-b border-gray-800"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    height: `${vRow.size}px`,
                    transform: `translateY(${vRow.start}px)`,
                    display: 'flex',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-1 py-1 align-top border-r border-gray-800 flex-shrink-0"
                      style={{ width: cell.column.getSize(), minWidth: cell.column.getSize(), overflow: 'hidden' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {/* Footer: total bytes per column */}
          <tfoot className="sticky bottom-0 bg-gray-900 z-10 border-t-2 border-blue-600">
            <tr style={{ display: 'flex' }}>
              {table.getAllColumns().map((col) => {
                const bpc = COL_BYTES[col.id] ?? 0;
                const totalB = bpc * 256;
                const sum = colSums[col.id as keyof typeof colSums];
                const isEncoded = ['t1_p0','t0_p0','t1_p1','t0_p1'].includes(col.id);
                return (
                  <td
                    key={col.id}
                    className={`px-2 py-1 text-[9px] font-mono border-r border-gray-800 align-top flex-shrink-0 ${isEncoded ? 'bg-indigo-950/60' : ''}`}
                    style={{ width: col.getSize(), minWidth: col.getSize() }}
                  >
                    {col.id === 'index' ? (
                      <div className="text-blue-400 font-bold text-[10px]">TOTAL↓</div>
                    ) : (
                      <div className="space-y-0.5">
                        {totalB > 0 && (
                          <div className={`font-bold ${isEncoded ? 'text-cyan-400' : 'text-blue-300'}`}>
                            {totalB % 1 === 0 ? totalB : totalB.toFixed(0)}B
                            {totalB >= 1024 ? ` = ${(totalB/1024).toFixed(2)}KB` : ''}
                          </div>
                        )}
                        <div className="text-gray-500">
                          Σ={sum !== undefined ? sum.toLocaleString() : '—'}
                        </div>
                        <div className="text-gray-600 text-[8px]">
                          {bpc > 0 ? `${bpc}B × 256` : ''}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Size summary below table */}
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-mono text-gray-400 px-1">
        <span>s: 2×512B = <span className="text-white">1024B</span></span>
        <span>A: 4×512B = <span className="text-white">2048B</span></span>
        <span>AS: 2×512B = <span className="text-white">1024B</span></span>
        <span className="text-yellow-300">t = AS+e: 2×512B = 1024B (raw 16-bit)</span>
        <span className="text-cyan-300">
          t1[0]+t0[0]+t1[1]+t0[1]: 4×384B = <span className="font-bold">768B</span> (compressed 12-bit)
        </span>
        <span className="text-green-300">Saving: 1024B → 768B = 25% smaller</span>
      </div>
    </div>
  );
}
