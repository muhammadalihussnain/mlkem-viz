import { useCallback } from 'react';
import { useKeyGenStore } from './store/keygenStore';
import { ControlPanel } from './components/ControlPanel';
import { StatsDashboard } from './components/StatsDashboard';
import { CoefficientTable } from './components/CoefficientTable';
import { PublicKeyView } from './components/PublicKeyView';
import { EncapTable } from './components/EncapTable';
import { exportToExcel } from './utils/export';
import { encapsulate } from './crypto/encapsulate';

function App() {
  const {
    setResult, setGenerating, setError, result,
    setEncapResult, setEncapsulating, encapResult, isEncapsulating,
  } = useKeyGenStore();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const worker = new Worker(new URL('./crypto/worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'KEYS_GENERATED') {
          setResult(e.data.payload);
          setGenerating(false);
          worker.terminate();
        } else if (e.data.type === 'ERROR') {
          setError(e.data.payload);
          worker.terminate();
        }
      };
      worker.postMessage({ type: 'GENERATE_KEYS' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate keys');
    }
  }, [setResult, setGenerating, setError]);

  const handleEncapsulate = useCallback(async () => {
    if (!result) return;
    setEncapsulating(true);
    try {
      const enc = await encapsulate(result);
      setEncapResult(enc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encapsulation failed');
    } finally {
      setEncapsulating(false);
    }
  }, [result, setEncapResult, setEncapsulating, setError]);

  const handleExport = useCallback(() => {
    if (result) exportToExcel(result);
  }, [result]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-3xl font-bold">ML-KEM-512 Key Generation Visualizer</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Complete visualization of ML-KEM-512 key generation + encapsulation (NIST FIPS 203)
        </p>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <ControlPanel onGenerate={handleGenerate} onExport={handleExport} />

        {result && (
          <>
            <StatsDashboard />

            {/* Public key assembly */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">
                Public Key Assembly — pk = ρ ∥ enc₁₂(t[0]) ∥ enc₁₂(t[1])
              </h2>
              <PublicKeyView />
            </section>

            {/* Alice keygen pipeline */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">
                Alice: Key Generation Pipeline
              </h2>
              <CoefficientTable />
            </section>

            {/* Bob encapsulation */}
            <section>
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-xl font-semibold text-gray-100">
                  Bob: Encapsulation Pipeline — u = Aᵀr+e1 &nbsp;|&nbsp; v = tᵀr+e2+encode(m)
                </h2>
                <button
                  onClick={handleEncapsulate}
                  disabled={isEncapsulating}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold text-sm transition"
                >
                  {isEncapsulating ? 'Encapsulating…' : encapResult ? 'Re-Encapsulate' : 'Encapsulate (Bob)'}
                </button>
              </div>
              <EncapTable />
            </section>
          </>
        )}

        {!result && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🔐</div>
            <p className="text-lg">Click "Generate Keys" to start the ML-KEM-512 visualization</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
