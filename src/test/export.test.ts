import { describe, it, expect, vi } from 'vitest';
import { exportToExcel } from '../utils/export';
import type { KeyGenResult } from '../crypto/types';
import { N } from '../crypto/types';

// Mock xlsx to avoid file writing in tests
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn((data: unknown[][]) => ({ data })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

function mockResult(): KeyGenResult {
  const poly = () => Array.from({ length: N }, (_, i) => i % 3329);
  return {
    matrixA: [[poly(), poly()], [poly(), poly()]],
    secretVector: { s0: poly(), s1: poly() },
    errorVector: { e0: poly(), e1: poly() },
    asIntermediate: [poly(), poly()],
    rawT: [poly(), poly()],
    encodedT1: [new Array(N).fill(1), new Array(N).fill(0)],
    encodedT0: [poly(), poly()],
    timing: { nttTime: 1, matrixMultTime: 2, errorAddTime: 0.5, encodingTime: 0.3, totalTime: 5 },
  };
}

describe('exportToExcel', () => {
  it('calls xlsx writeFile without throwing', async () => {
    const xlsx = await import('xlsx');
    expect(() => exportToExcel(mockResult())).not.toThrow();
    expect(xlsx.writeFile).toHaveBeenCalledTimes(1);
  });

  it('creates 6 worksheets', async () => {
    const xlsx = await import('xlsx');
    vi.clearAllMocks();
    exportToExcel(mockResult());
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(6);
  });

  it('worksheet names include expected sheets', async () => {
    const xlsx = await import('xlsx');
    vi.clearAllMocks();
    exportToExcel(mockResult());
    const calls = (xlsx.utils.book_append_sheet as ReturnType<typeof vi.fn>).mock.calls;
    const sheetNames = calls.map((c: unknown[]) => c[2]);
    expect(sheetNames).toContain('Matrix_A_16bit');
    expect(sheetNames).toContain('AS_Intermediate_16bit');
    expect(sheetNames).toContain('AS+e_Raw_t_16bit');
    expect(sheetNames).toContain('t1_Encoded_12bit');
    expect(sheetNames).toContain('t0_Encoded_12bit');
    expect(sheetNames).toContain('Statistics_Summary');
  });

  it('matrix A sheet has 257 rows (header + 256 data)', async () => {
    const xlsx = await import('xlsx');
    vi.clearAllMocks();
    exportToExcel(mockResult());
    const aoa = xlsx.utils.aoa_to_sheet as ReturnType<typeof vi.fn>;
    const matrixACall = aoa.mock.calls[0][0] as unknown[][];
    expect(matrixACall).toHaveLength(257);
    expect(matrixACall[0]).toEqual(['Index', 'A[0][0]', 'A[0][1]', 'A[1][0]', 'A[1][1]']);
  });
});
