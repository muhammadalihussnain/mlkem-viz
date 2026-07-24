/**
 * Public Key assembly visualization.
 *
 * FIPS 203 ML-KEM-512 public key structure:
 *   pk = ρ (32 bytes) || ByteEncode12(t[0]) (384 bytes) || ByteEncode12(t[1]) (384 bytes)
 *      = 800 bytes total
 */

import { useKeyGenStore } from '../store/keygenStore';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function ByteBlock({ bytes, label, color, size }: {
  bytes: Uint8Array;
  label: string;
  color: string;
  size: string;
}) {
  const hex = toHex(bytes);
  return (
    <div className={`rounded-lg border ${color} p-3`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-sm">{label}</span>
        <span className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded">{size}</span>
      </div>
      <div className="font-mono text-[10px] text-gray-300 break-all leading-relaxed max-h-24 overflow-y-auto">
        {hex}
      </div>
    </div>
  );
}

export function PublicKeyView() {
  const { result } = useKeyGenStore();
  if (!result) return null;

  const { publicKey, encodedT1 } = result;
  const rhoPart   = publicKey.slice(0, 32);
  const enc0Part  = publicKey.slice(32, 416);
  const enc1Part  = publicKey.slice(416, 800);

  // Sample first 8 coefficients of enc to show the 12-bit packing
  const sampleEnc0 = encodedT1[0].slice(0, 8);
  const sampleEnc1 = encodedT1[1].slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Structure diagram */}
      <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="text-sm font-bold text-gray-200 mb-3">
          Public Key Structure  —  pk = ρ ∥ encode₁₂(t[0]) ∥ encode₁₂(t[1])
        </div>

        {/* Visual bar */}
        <div className="flex rounded overflow-hidden h-10 mb-3 text-xs font-bold">
          <div
            className="bg-emerald-700 flex items-center justify-center text-white border-r border-gray-900"
            style={{ width: `${(32 / 800) * 100}%` }}
          >
            ρ 32B
          </div>
          <div
            className="bg-indigo-700 flex items-center justify-center text-white border-r border-gray-900"
            style={{ width: `${(384 / 800) * 100}%` }}
          >
            encode₁₂(t[0]) — 384 B
          </div>
          <div
            className="bg-violet-700 flex items-center justify-center text-white"
            style={{ width: `${(384 / 800) * 100}%` }}
          >
            encode₁₂(t[1]) — 384 B
          </div>
        </div>

        {/* Size breakdown */}
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-emerald-400 font-bold text-sm">32 B</div>
            <div className="text-gray-400">ρ (rho)</div>
            <div className="text-gray-500 text-[9px]">matrix seed</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-indigo-400 font-bold text-sm">384 B</div>
            <div className="text-gray-400">encode₁₂(t[0])</div>
            <div className="text-gray-500 text-[9px]">256 × 12-bit</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-violet-400 font-bold text-sm">384 B</div>
            <div className="text-gray-400">encode₁₂(t[1])</div>
            <div className="text-gray-500 text-[9px]">256 × 12-bit</div>
          </div>
          <div className="bg-blue-900/50 border border-blue-700 rounded p-2 text-center">
            <div className="text-blue-300 font-bold text-sm">800 B</div>
            <div className="text-blue-200">Total pk</div>
            <div className="text-blue-400 text-[9px]">32 + 384 + 384</div>
          </div>
        </div>
      </div>

      {/* Concatenation explanation */}
      <div className="p-3 bg-gray-800 border border-gray-700 rounded text-xs font-mono">
        <div className="text-yellow-300 font-bold mb-2">How the public key is assembled:</div>
        <div className="space-y-1 text-gray-300">
          <div>
            <span className="text-emerald-400">ρ</span> (32 bytes) — random seed used to derive matrix A via SHAKE-128.
            Anyone with ρ can regenerate A, so it doesn't need to be stored separately.
          </div>
          <div>
            <span className="text-indigo-400">encode₁₂(t[0])</span> (384 bytes) — 256 coefficients of t[0], each packed into 12 bits.
            3 bytes hold 2 coefficients: [c₀ bits 0–7] [c₀ bits 8–11 | c₁ bits 0–3] [c₁ bits 4–11]
          </div>
          <div>
            <span className="text-violet-400">encode₁₂(t[1])</span> (384 bytes) — same packing for t[1].
          </div>
          <div className="mt-1 text-blue-300 font-bold">
            pk = concat(ρ, encode₁₂(t[0]), encode₁₂(t[1])) = 800 bytes
          </div>
        </div>
      </div>

      {/* 12-bit packing example */}
      <div className="p-3 bg-gray-800 border border-gray-700 rounded text-xs font-mono">
        <div className="text-yellow-300 font-bold mb-2">
          12-bit packing example — first 8 coefficients of t[0]:
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {sampleEnc0.map((val, i) => (
            <div key={i} className="bg-indigo-950 rounded px-2 py-1">
              <div className="text-gray-400 text-[9px]">t[0][{i}]</div>
              <div className="text-white font-bold">{val}</div>
              <div className="text-indigo-300 text-[9px]">{val.toString(2).padStart(12, '0')}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {sampleEnc1.map((val, i) => (
            <div key={i} className="bg-violet-950 rounded px-2 py-1">
              <div className="text-gray-400 text-[9px]">t[1][{i}]</div>
              <div className="text-white font-bold">{val}</div>
              <div className="text-violet-300 text-[9px]">{val.toString(2).padStart(12, '0')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actual byte content */}
      <div className="grid grid-cols-1 gap-3">
        <ByteBlock
          bytes={rhoPart}
          label="ρ (rho) — matrix generation seed"
          color="border-emerald-700 bg-emerald-950/30 text-emerald-300"
          size="32 bytes"
        />
        <ByteBlock
          bytes={enc0Part}
          label="encode₁₂(t[0]) — first polynomial packed"
          color="border-indigo-700 bg-indigo-950/30 text-indigo-300"
          size="384 bytes"
        />
        <ByteBlock
          bytes={enc1Part}
          label="encode₁₂(t[1]) — second polynomial packed"
          color="border-violet-700 bg-violet-950/30 text-violet-300"
          size="384 bytes"
        />
        <div className="rounded-lg border border-blue-600 bg-blue-950/30 p-3">
          <div className="flex justify-between items-center">
            <span className="text-blue-300 font-bold text-sm">Total Public Key (pk)</span>
            <span className="font-mono text-xs bg-blue-900 px-2 py-0.5 rounded text-blue-200">
              {publicKey.length} bytes = {(publicKey.length / 1024).toFixed(3)} KB
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 font-mono">
            = ρ (32) + encode₁₂(t[0]) (384) + encode₁₂(t[1]) (384)
          </div>
        </div>
      </div>
    </div>
  );
}
