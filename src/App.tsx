import { useCallback } from 'react';
import { useKeyGenStore } from './store/keygenStore';
import { ControlPanel } from './components/ControlPanel';
import { StatsDashboard } from './components/StatsDashboard';
import { CoefficientTable } from './components/CoefficientTable';
import { exportToExcel } from './utils/export';

function App() {
  const { setResult, setGenerating, setError, result } = useKeyGenStore();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const worker = new Worker(new URL('./crypto/worker.ts', import.meta.url), {
        type: 'module',
      });

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

  const handleExport = useCallback(() => {
    if (result) {
      exportToExcel(result);
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-3xl font-bold">ML-KEM-512 Key Generation Visualizer</h1>
        <p className="text-gray-400 mt-1">
          Complete visualization of the ML-KEM-512 cryptographic key generation process (NIST FIPS 203)
        </p>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <ControlPanel onGenerate={handleGenerate} onExport={handleExport} />

        {result && (
          <>
            <StatsDashboard />
            <div>
              <h2 className="text-xl font-semibold mb-3">Coefficient Pipeline View</h2>
              <CoefficientTable />
            </div>
          </>
        )}

        {!result && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🔐</div>
            <p className="text-lg">Click "Generate Keys" to visualize the ML-KEM-512 process</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
