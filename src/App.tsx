/**
 * ML-KEM-512 Step-by-Step Demo — FIPS 203
 */

import { useRef, useState } from 'react';
import { AlicePanel }   from './components/AlicePanel';
import { BobPanel }     from './components/BobPanel';
import { InfoSection }  from './components/InfoSection';
import { useStore }     from './store/keygenStore';

const ZOOM_STEP = 0.1;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2.0;

function App() {
  const { reset } = useStore();
  const [zoom, setZoom] = useState(1.4);

  const aliceRef = useRef<HTMLDivElement>(null);
  const bobRef   = useRef<HTMLDivElement>(null);

  const scrollToBob   = () => bobRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToAlice = () => aliceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const zoomIn  = () => setZoom(z => Math.min(+(z + ZOOM_STEP).toFixed(1), ZOOM_MAX));
  const zoomOut = () => setZoom(z => Math.max(+(z - ZOOM_STEP).toFixed(1), ZOOM_MIN));
  const zoomReset = () => setZoom(1.4);

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Sticky header — always at 100% scale ── */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 bg-white z-30 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">ML-KEM-512 — Step-by-Step Visualization</h1>
          <p className="text-sm text-gray-500 mt-0.5">FIPS 203 · Press buttons in order ↓</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="px-3 py-1.5 text-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={zoomReset}
              className="px-3 py-1.5 text-sm font-mono font-bold text-gray-700 hover:bg-gray-100 border-x border-gray-300 transition min-w-[52px] text-center"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="px-3 py-1.5 text-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom in"
            >
              +
            </button>
          </div>

          <button
            onClick={reset}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition"
          >
            Reset
          </button>
        </div>
      </header>

      {/* ── Scaled content area ── */}
      {/*
        We wrap main in a div whose width stays at 100vw but whose inner content
        is scaled. transform-origin: top center keeps it aligned to the top.
        The outer div height tracks the scaled height so the page scrolls correctly.
      */}
      <div style={{ height: `${zoom * 100}%` }}>
        <main
          style={{
            transformOrigin: 'top left',
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
          }}
          className="px-6 py-6 space-y-8"
        >
          <InfoSection />
          <div ref={aliceRef}>
            <AlicePanel onPubKeyGenerated={scrollToBob} />
          </div>
          <div ref={bobRef}>
            <BobPanel onCompressed={scrollToAlice} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
