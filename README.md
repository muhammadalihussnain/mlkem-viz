# ML-KEM-512 Key Generation Visualizer

A professional web-based visualization tool demonstrating the complete ML-KEM-512 (Kyber) key generation process following NIST FIPS 203 standard.

## Features

- **Complete ML-KEM-512 Implementation**: Matrix generation, NTT transforms, matrix-vector multiplication, error addition, encoding
- **Real-time Visualization**: Interactive coefficient table with 256 rows showing all computation stages
- **Virtual Scrolling**: Efficient rendering of large datasets using TanStack Table and Virtual
- **Performance Metrics**: Detailed timing breakdown for NTT, matrix mult, error addition, encoding
- **Memory Footprint Analysis**: Precise byte-level memory calculations for all data structures
- **Excel Export**: Multi-worksheet exports with formatted coefficient data and statistics
- **Web Worker**: Off-main-thread crypto computation for responsive UI
- **Dark Theme**: Professional UI optimized for viewing numeric data

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **TanStack Table** (virtual scrolling)
- **Tailwind CSS** (UI styling)
- **SheetJS/xlsx** (Excel export)
- **Zustand** (state management)
- **Web Crypto API** (CSPRNG)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:5173` and click "Generate Keys" to visualize the ML-KEM-512 process.

## Architecture

```
src/
├── crypto/           # ML-KEM-512 implementation
│   ├── types.ts      # Type definitions
│   ├── ntt.ts        # Number Theoretic Transform
│   ├── mlkem.ts      # Core key generation
│   └── worker.ts     # Web Worker wrapper
├── components/       # React components
│   ├── CoefficientTable.tsx  # Virtual scrolling table
│   ├── StatsDashboard.tsx    # Memory & performance stats
│   └── ControlPanel.tsx      # UI controls
├── store/            # Zustand state management
└── utils/            # Excel export utilities
```

## Implementation Notes

- **Modular Arithmetic**: All operations use mod q=3329
- **NTT Domain**: Matrix multiplication performed in NTT domain for efficiency
- **CBD Sampling**: Secret and error vectors use Centered Binomial Distribution (eta=2)
- **Encoding**: t values compressed into 12-bit t1 and t0 components
- **Validation**: Coefficients validated at each stage to ensure correctness

## Data Flow

1. Generate matrix A (4 polynomials, 256 coefficients each)
2. Sample secret vector s using CBD
3. Sample error vector e using CBD
4. Compute AS = A × s in NTT domain
5. Add error: t = AS + e
6. Encode t into t1 (high bits) and t0 (low bits)
7. Display all 256 coefficients across 11 stages in table

## Export Format

Excel exports include:
- **Matrix_A_16bit**: Full A matrix coefficients
- **AS_Intermediate_16bit**: Matrix multiplication results
- **AS+e_Raw_t_16bit**: Results after error addition
- **t1_Encoded_12bit**: High-bit encoding
- **t0_Encoded_12bit**: Low-bit encoding
- **Statistics_Summary**: Memory footprint and performance metrics

## Browser Requirements

- Modern browser with Web Crypto API support
- Web Worker support
- ES2020+ JavaScript

## License

MIT
