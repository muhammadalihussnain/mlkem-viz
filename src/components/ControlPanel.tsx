/**
 * Control panel for key generation and filtering
 */

import { useKeyGenStore } from '../store/keygenStore';

interface ControlPanelProps {
  onGenerate: () => void;
  onExport: () => void;
}

export function ControlPanel({ onGenerate, onExport }: ControlPanelProps) {
  const { isGenerating, filterRange, setFilterRange, result } = useKeyGenStore();

  return (
    <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-800 rounded-lg">
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
      >
        {isGenerating ? 'Generating...' : 'Generate Keys'}
      </button>

      {result && (
        <>
          <button
            onClick={onExport}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
          >
            Export to Excel
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Filter Range:</label>
            <input
              type="number"
              value={filterRange[0]}
              onChange={(e) => setFilterRange([+e.target.value, filterRange[1]])}
              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              min={0}
              max={3328}
            />
            <span className="text-gray-400">to</span>
            <input
              type="number"
              value={filterRange[1]}
              onChange={(e) => setFilterRange([filterRange[0], +e.target.value])}
              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              min={0}
              max={3328}
            />
          </div>

          <div className="ml-auto text-sm text-gray-400">
            Showing {result ? '256 coefficients' : '0 coefficients'}
          </div>
        </>
      )}
    </div>
  );
}
