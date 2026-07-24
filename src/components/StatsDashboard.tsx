/**
 * Statistics and memory footprint dashboard
 */

import { useKeyGenStore } from '../store/keygenStore';

export function StatsDashboard() {
  const { result } = useKeyGenStore();

  if (!result) return null;

  const memoryBreakdown = {
    matrixA: 2048, // 4 * 256 * 2 bytes
    as: 512, // 256 * 2 bytes
    rawT: 512,
    t1: 384, // 256 * 1.5 bytes (12-bit packed)
    t0: 384,
  };

  const total = Object.values(memoryBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Memory Footprint</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Matrix A (4 polys):</span>
            <span className="font-mono text-green-400">{memoryBreakdown.matrixA}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">AS intermediate:</span>
            <span className="font-mono text-blue-400">{memoryBreakdown.as}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Raw t (AS+e):</span>
            <span className="font-mono text-yellow-400">{memoryBreakdown.rawT}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Encoded t1:</span>
            <span className="font-mono text-purple-400">{memoryBreakdown.t1}B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Encoded t0:</span>
            <span className="font-mono text-purple-400">{memoryBreakdown.t0}B</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-700">
            <span className="font-semibold text-gray-200">Total:</span>
            <span className="font-mono font-bold text-white">{total}B ({(total / 1024).toFixed(2)}KB)</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Performance</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">NTT Time:</span>
            <span className="font-mono text-green-400">{result.timing.nttTime.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Matrix Mult:</span>
            <span className="font-mono text-blue-400">{result.timing.matrixMultTime.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Error Addition:</span>
            <span className="font-mono text-yellow-400">{result.timing.errorAddTime.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Encoding:</span>
            <span className="font-mono text-purple-400">{result.timing.encodingTime.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-700">
            <span className="font-semibold text-gray-200">Total:</span>
            <span className="font-mono font-bold text-white">{result.timing.totalTime.toFixed(2)}ms</span>
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Coefficient Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Matrix A[0][0]</div>
            <div className="font-mono text-xs space-y-0.5">
              <div>Min: {Math.min(...result.matrixA[0][0])}</div>
              <div>Max: {Math.max(...result.matrixA[0][0])}</div>
              <div>Mean: {Math.round(result.matrixA[0][0].reduce((a, b) => a + b) / 256)}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">AS[0]</div>
            <div className="font-mono text-xs space-y-0.5">
              <div>Min: {Math.min(...result.asIntermediate[0])}</div>
              <div>Max: {Math.max(...result.asIntermediate[0])}</div>
              <div>Mean: {Math.round(result.asIntermediate[0].reduce((a, b) => a + b) / 256)}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Raw t[0]</div>
            <div className="font-mono text-xs space-y-0.5">
              <div>Min: {Math.min(...result.rawT[0])}</div>
              <div>Max: {Math.max(...result.rawT[0])}</div>
              <div>Mean: {Math.round(result.rawT[0].reduce((a, b) => a + b) / 256)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
