/**
 * Virtual scrolling coefficient table using TanStack Table.
 * Each cell shows: decimal, binary, byte size.
 * Footer shows column total size.
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

function getValueColor(val: number, max: number): string {
  const ratio = Math.abs(val) / max;
  if (ratio < 0.3) return '#1a4731';
  if (ratio < 0.6) return '#3d3010';
  if (ratio < 0.85) return '#4a2000';
  return '#4a1010';
}

/** 16-bit cell */
function Cell16({ val }: { val: number }) {
  const binary = val.toString(2).padStart(16, '0');
  return (
    <div style={{ backgroundColor: getValueColor(val, 3328) }}
      className="rounded px-1 py-0.5 font-mono text-xs leading-tight min-w-[140px]"
    >
      <div className="text-white font-semibold text-sm">{val}</div>
      <div className="text-gray-300 text-[10px] tracking-tight break-all">{binary}</div>
      <div className="text-gray-400 text-[9px]">16-bit · 2 bytes</div>
    </div>
  );
}

/** Small-coefficient cell for secret vector (values in [-3..3] mod q) */
function CellSmall({ val }: { val: number }) {
  // CBD values stored mod q: 0,1,2,3 or 3326,3327,3328 (negative)
  const signed = val > 3329 / 2 ? val - 3329 : val;
  const binary = val.toString(2).padStart(16, '0');
  const bg = signed < 0 ? '#3a1a1a' : signed === 0 ? '#1a1a2e' : '#1a3a1a';
  return (
    <div style={{ backgroundColor: bg }}
      className="rounded px-1 py-0.5 font-mono text-xs leading-tight min-w-[140px]"
    >
      <div className="text-white font-semibold text-sm">
        {val} <span className="text-yellow-400 text-[9px]">({signed >= 0 ? '+' : ''}{signed})</span>
      </div>
      <div className="text-gray-300 text-[10px] tracking-tight break-all">{binary}</div>
      <div className="text-gray-400 text-[9px]">16-bit · 2 bytes (CBD coeff)</div>
    </div>
  );
}

/** Encoded split cell: t1 (high 12-bit) + t0 (low 12-bit) with reconstruction check */
function CellEncoded({ rawT, t1, t0 }: { rawT: number; t1: number; t0: number }) {
  const reconstructed = t1 * 2048 - 1024 + t0;
  const ok = reconstructed === rawT;
  return (
    <div className="rounded px-1 py-0.5 font-mono text-xs leading-tight bg-gray-800/50 min-w-[280px]">
      <div className="text-yellow-300 text-[9px] font-bold mb-0.5">
        raw={rawT} → t1·2¹¹ decomposition
      </div>
      <div className="flex gap-1 mb-0.5">
        <div className="flex-1 bg-purple-900/50 rounded px-1 py-0.5">
          <div className="text-purple-300 text-[8px]">t1=(t+2¹⁰)≫11</div>
          <div className="text-white font-bold text-sm">{t1}</div>
          <div className="text-gray-300 text-[9px] break-all">{t1.toString(2).padStart(12, '0')}</div>
          <div className="text-gray-400 text-[8px]">12-bit · 1.5B</div>
        </div>
        <div className="flex-1 bg-blue-900/50 rounded px-1 py-0.5">
          <div className="text-blue-300 text-[8px]">t0=t−t1·2¹¹+2¹⁰</div>
          <div className="text-white font-bold text-sm">{t0}</div>
          <div className="text-gray-300 text-[9px] break-all">{t0.toString(2).padStart(12, '0')}</div>
          <div className="text-gray-400 text-[8px]">12-bit · 1.5B</div>
        </div>
      </div>
      <div className={`text-[8px] ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✓' : '✗'} {t1}×2048−1024+{t0}={reconstructed}
      </div>
    </div>
  );
}

// Column byte sizes for footer totals (per coefficient × 256 coefficients)
const COL_BYTES: Record<string, number> = {
  s0: 2, s1: 2,
  a00: 2, a01: 2, a10: 2, a11: 2,
  as0: 2, as1: 2,
  t0_raw: 2, t1_raw: 2,
  enc_poly0: 3, // 1.5 + 1.5
  enc_poly1: 3,
};

export function CoefficientTable() {
  const { rows, filterRange } = useKeyGenStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.a00 >= filterRange[0] && r.a00 <= filterRange[1]),
    [rows, filterRange]
  );

  // Column sum totals (sum of all values × bytes each)
  const colTotals = useMemo(() => {
    if (!rows.length) return {} as Record<string, number>;
    const sum = (key: keyof CoefficientRow) =>
      rows.reduce((acc, r) => acc + (r[key] as number), 0);
    return {
      s0: sum('s0'), s1: sum('s1'),
      a00: sum('a00'), a01: sum('a01'), a10: sum('a10'), a11: sum('a11'),
      as0: sum('as0'), as1: sum('as1'),
      t0_raw: sum('t0_raw'), t1_raw: sum('t1_raw'),
    };
  }, [rows]);

  const columns = useMemo(() => [
    columnHelper.accessor('index', {
      header: 'Index',
      cell: (info) => (
        <div className="font-mono font-bold text-gray-300">{info.getValue()}</div>
      ),
      size: 60,
    }),
    // Secret vector
    columnHelper.accessor('s0', {
      header: 's[0] — Secret Vec — 16-bit',
      cell: (info) => <CellSmall val={info.getValue()} />,
      size: 175,
    }),
    columnHelper.accessor('s1', {
      header: 's[1] — Secret Vec — 16-bit',
      cell: (info) => <CellSmall val={info.getValue()} />,
      size: 175,
    }),
    // Matrix A
    columnHelper.accessor('a00', {
      header: 'A[0][0] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    columnHelper.accessor('a01', {
      header: 'A[0][1] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    columnHelper.accessor('a10', {
      header: 'A[1][0] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    columnHelper.accessor('a11', {
      header: 'A[1][1] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    // AS intermediate
    columnHelper.accessor('as0', {
      header: 'AS[0] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    columnHelper.accessor('as1', {
      header: 'AS[1] — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 160,
    }),
    // Raw t = AS + e
    columnHelper.accessor('t0_raw', {
      header: 't[0] raw (AS+e) — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 175,
    }),
    columnHelper.accessor('t1_raw', {
      header: 't[1] raw (AS+e) — 16-bit',
      cell: (info) => <Cell16 val={info.getValue()} />,
      size: 175,
    }),
    // Encoded split
    columnHelper.display({
      id: 'enc_poly0',
      header: 't[0] Encoded → t1 (high) + t0 (low) — 12-bit each',
      cell: ({ row }) => (
        <CellEncoded
          rawT={row.original.t0_raw}
          t1={row.original.t1_enc}
          t0={row.original.t0_enc}
        />
      ),
      size: 300,
    }),
    columnHelper.display({
      id: 'enc_poly1',
      header: 't[1] Encoded → t1 (high) + t0 (low) — 12-bit each',
      cell: ({ row }) => (
        <CellEncoded
          rawT={row.original.t1_raw}
          t1={row.original.t1_enc_poly1}
          t0={row.original.t0_enc_poly1}
        />
      ),
      size: 300,
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
    estimateSize: () => 90,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Generate keys to see coefficient data
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2 px-1">
        {[
          ['#1a4731', '0–30%'],
          ['#3d3010', '30–60%'],
          ['#4a2000', '60–85%'],
          ['#4a1010', '85–100%'],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="text-gray-500 ml-2">
          Scroll right → to see full pipeline. Encoded columns show live reconstruction check.
        </span>
      </div>

      {/* Scrollable container — horizontal + vertical */}
      <div
        ref={parentRef}
        className="h-[640px] overflow-auto border border-gray-700 rounded"
        style={{ overflowX: 'auto', overflowY: 'auto' }}
      >
        <table className="text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-gray-900 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-700">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-left text-gray-300 font-semibold whitespace-nowrap border-r border-gray-800 text-xs"
                    style={{ width: header.getSize(), minWidth: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Virtual body */}
          <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = tableRows[vRow.index];
              return (
                <tr
                  key={row.id}
                  className="hover:bg-gray-800/30 border-b border-gray-800"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: `${vRow.size}px`,
                    transform: `translateY(${vRow.start}px)`,
                    display: 'flex',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-1 align-top border-r border-gray-800 flex-shrink-0"
                      style={{ width: cell.column.getSize(), minWidth: cell.column.getSize(), overflow: 'hidden' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {/* Footer: column total sizes */}
          <tfoot className="sticky bottom-0 bg-gray-900 z-10 border-t-2 border-blue-700">
            <tr>
              {table.getAllColumns().map((col) => {
                const key = col.id as keyof typeof colTotals;
                const bytesPerCoeff = COL_BYTES[col.id] ?? 0;
                const totalBytes = bytesPerCoeff * 256;
                const sum = colTotals[key as keyof typeof colTotals];
                return (
                  <td
                    key={col.id}
                    className="px-2 py-1 text-[9px] font-mono border-r border-gray-800 align-top"
                    style={{ width: col.getSize(), minWidth: col.getSize() }}
                  >
                    {col.id === 'index' ? (
                      <span className="text-blue-400 font-bold">TOTAL</span>
                    ) : (
                      <div className="space-y-0.5">
                        {totalBytes > 0 && (
                          <div className="text-blue-300 font-bold">
                            {totalBytes}B
                            {totalBytes >= 1024 ? ` (${(totalBytes / 1024).toFixed(2)}KB)` : ''}
                          </div>
                        )}
                        {sum !== undefined && (
                          <div className="text-gray-400">Σ={sum.toLocaleString()}</div>
                        )}
                        {(col.id === 'enc_poly0' || col.id === 'enc_poly1') && (
                          <div className="text-purple-300 font-bold">
                            384B t1 + 384B t0 = 768B
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
