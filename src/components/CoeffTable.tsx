/**
 * CoeffTable — Excel-style table, horizontal scroll, vertical virtualisation.
 * Fixed readable font sizes throughout.
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface ColDef {
  key:     string;
  header:  string;
  sub?:    string;
  data:    number[];
  bits?:   number;    // default 16
  bg?:     string;
  cellBg?: string;
}

export interface ColGroup {
  label: string;
  bg:    string;
  keys:  string[];
}

interface Props {
  cols:   ColDef[];
  groups: ColGroup[];
}

const ROW_H   = 64;   // taller rows so both decimal + binary fit
const IDX_W   = 60;
const COL_W   = 160;  // wider columns so 16-bit binary is readable
const GRP_H   = 32;   // group header height
const COL_H   = 48;   // column header height
const HEAD_H  = GRP_H + COL_H;
const FOOT_H  = 28;

export function CoeffTable({ cols, groups }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: 256,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  const totalW = IDX_W + cols.length * COL_W;
  const tableH = Math.min(256 * ROW_H, 10 * ROW_H) + HEAD_H + FOOT_H;

  return (
    <div
      ref={parentRef}
      className="border border-gray-300 rounded overflow-auto w-full"
      style={{ height: tableH }}
    >
      <div style={{ width: totalW, minWidth: totalW, position: 'relative' }}>

        {/* ── Group header ── */}
        <div className="flex sticky top-0 z-20 border-b border-gray-300">
          <div
            className="shrink-0 border-r border-gray-300 flex items-center justify-center bg-gray-200"
            style={{ width: IDX_W, minWidth: IDX_W, height: GRP_H }}
          >
            <span className="text-xs font-bold text-gray-500 uppercase">idx</span>
          </div>
          {groups.map(g => {
            const w = cols.filter(c => g.keys.includes(c.key)).length * COL_W;
            if (w === 0) return null;
            return (
              <div
                key={g.label}
                className="shrink-0 border-r border-gray-400 flex items-center justify-center px-3"
                style={{ width: w, minWidth: w, height: GRP_H, background: g.bg }}
              >
                <span className="text-sm font-bold text-white whitespace-nowrap drop-shadow-sm">
                  {g.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Column header ── */}
        <div className="flex sticky z-20 border-b-2 border-gray-400" style={{ top: GRP_H }}>
          <div
            className="shrink-0 border-r border-gray-300 bg-gray-100 flex items-center justify-center"
            style={{ width: IDX_W, minWidth: IDX_W, height: COL_H }}
          >
            <span className="text-sm font-bold text-gray-500">#</span>
          </div>
          {cols.map(col => (
            <div
              key={col.key}
              className="shrink-0 border-r border-gray-300 px-3 flex flex-col justify-center"
              style={{ width: COL_W, minWidth: COL_W, height: COL_H, background: col.bg ?? '#f9fafb' }}
            >
              <span className="text-sm font-bold text-gray-800 whitespace-nowrap leading-tight">{col.header}</span>
              {col.sub && <span className="text-xs text-gray-500 whitespace-nowrap leading-tight mt-0.5">{col.sub}</span>}
            </div>
          ))}
        </div>

        {/* ── Virtual rows ── */}
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vRow => {
            const i = vRow.index;
            return (
              <div
                key={i}
                className={`flex absolute top-0 left-0 border-b border-gray-100 hover:bg-yellow-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                style={{ width: totalW, height: ROW_H, transform: `translateY(${vRow.start}px)` }}
              >
                {/* index */}
                <div
                  className="shrink-0 border-r border-gray-200 bg-gray-100 flex items-center justify-center"
                  style={{ width: IDX_W, minWidth: IDX_W, height: ROW_H }}
                >
                  <span className="font-mono text-sm font-bold text-gray-600">{i}</span>
                </div>

                {/* data cells */}
                {cols.map(col => {
                  const val  = col.data[i] ?? 0;
                  const bits = col.bits ?? 16;
                  const mask = bits >= 32 ? 0xFFFFFFFF : (1 << bits) - 1;
                  const bin  = (val & mask).toString(2).padStart(bits, '0');
                  // split 16-bit binary into groups of 4 for readability: 0000 1111 0000 1111
                  const binDisplay = bits <= 4
                    ? bin
                    : bin.match(/.{1,4}/g)?.join(' ') ?? bin;

                  return (
                    <div
                      key={col.key}
                      className="shrink-0 border-r border-gray-200 px-3 flex flex-col justify-center gap-0.5"
                      style={{ width: COL_W, minWidth: COL_W, height: ROW_H, background: col.cellBg ?? 'transparent' }}
                    >
                      {/* decimal */}
                      <span className="font-mono text-base font-bold text-gray-900 tabular-nums leading-none">
                        {val}
                      </span>
                      {/* binary — grouped in nibbles */}
                      <span className="font-mono text-[11px] text-gray-500 leading-none tracking-wide">
                        {binDisplay}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex sticky bottom-0 z-20 border-t-2 border-gray-400 bg-gray-100">
          <div
            className="shrink-0 border-r border-gray-300 flex items-center justify-center"
            style={{ width: IDX_W, minWidth: IDX_W, height: FOOT_H }}
          >
            <span className="text-xs font-bold text-gray-500">256</span>
          </div>
          {cols.map(col => {
            const bits  = col.bits ?? 16;
            const bytes = Math.ceil(256 * bits / 8);
            return (
              <div
                key={col.key}
                className="shrink-0 border-r border-gray-200 flex items-center px-3"
                style={{ width: COL_W, minWidth: COL_W, height: FOOT_H }}
              >
                <span className="text-xs font-mono text-gray-600 font-semibold">
                  {bits}-bit · {bytes}B
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
