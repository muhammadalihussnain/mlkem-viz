import { describe, it, expect, beforeEach } from 'vitest';
import { useKeyGenStore } from '../store/keygenStore';
import type { KeyGenResult } from '../crypto/types';
import { N } from '../crypto/types';

function mockResult(): KeyGenResult {
  const poly = () => Array.from({ length: N }, (_, i) => i % 3329);
  return {
    matrixA: [[poly(), poly()], [poly(), poly()]],
    nttA: [[poly(), poly()], [poly(), poly()]],
    secretVector: { s0: poly(), s1: poly() },
    nttS: [poly(), poly()],
    errorVector: { e0: poly(), e1: poly() },
    asIntermediate: [poly(), poly()],
    nttProduct: [poly(), poly()],
    rawT: [poly(), poly()],
    encodedT1: [new Array(N).fill(1), new Array(N).fill(0)],
    encodedT0: [poly(), poly()],
    timing: { nttTime: 1, matrixMultTime: 2, errorAddTime: 0.5, encodingTime: 0.3, totalTime: 5 },
  };
}

describe('useKeyGenStore', () => {
  beforeEach(() => {
    useKeyGenStore.setState({
      result: null, rows: [], isGenerating: false, error: null,
      filterRange: [0, 3328], searchIndex: '',
    });
  });

  it('initial state is correct', () => {
    const s = useKeyGenStore.getState();
    expect(s.result).toBeNull();
    expect(s.rows).toHaveLength(0);
    expect(s.isGenerating).toBe(false);
    expect(s.error).toBeNull();
    expect(s.filterRange).toEqual([0, 3328]);
  });

  it('setResult builds 256 rows and clears error', () => {
    const result = mockResult();
    useKeyGenStore.getState().setResult(result);
    const s = useKeyGenStore.getState();
    expect(s.rows).toHaveLength(256);
    expect(s.result).toBe(result);
    expect(s.error).toBeNull();
  });

  it('rows contain correct index values', () => {
    useKeyGenStore.getState().setResult(mockResult());
    const { rows } = useKeyGenStore.getState();
    rows.forEach((r, i) => expect(r.index).toBe(i));
  });

  it('rows contain s0 and s1 secret vector coefficients', () => {
    const result = mockResult();
    useKeyGenStore.getState().setResult(result);
    const { rows } = useKeyGenStore.getState();
    expect(rows[0].s0).toBe(result.secretVector.s0[0]);
    expect(rows[0].s1).toBe(result.secretVector.s1[0]);
  });

  it('rows contain NTT intermediate values', () => {
    const result = mockResult();
    useKeyGenStore.getState().setResult(result);
    const { rows } = useKeyGenStore.getState();
    expect(rows[3].nttA00).toBe(result.nttA[0][0][3]);
    expect(rows[3].nttS0).toBe(result.nttS[0][3]);
    expect(rows[3].nttProd0).toBe(result.nttProduct[0][3]);
    expect(rows[3].as0).toBe(result.asIntermediate[0][3]);
  });

  it('rows contain encoded values (enc0, enc1) matching encodedT1', () => {
    const result = mockResult();
    useKeyGenStore.getState().setResult(result);
    const { rows } = useKeyGenStore.getState();
    expect(rows[5].enc0).toBe(result.encodedT1[0][5]);
    expect(rows[5].enc1).toBe(result.encodedT1[1][5]);
  });

  it('setGenerating sets isGenerating', () => {
    useKeyGenStore.getState().setGenerating(true);
    expect(useKeyGenStore.getState().isGenerating).toBe(true);
    useKeyGenStore.getState().setGenerating(false);
    expect(useKeyGenStore.getState().isGenerating).toBe(false);
  });

  it('setError sets error and stops generating', () => {
    useKeyGenStore.getState().setGenerating(true);
    useKeyGenStore.getState().setError('something failed');
    const s = useKeyGenStore.getState();
    expect(s.error).toBe('something failed');
    expect(s.isGenerating).toBe(false);
  });

  it('setFilterRange updates filterRange', () => {
    useKeyGenStore.getState().setFilterRange([100, 2000]);
    expect(useKeyGenStore.getState().filterRange).toEqual([100, 2000]);
  });

  it('setSearchIndex updates searchIndex', () => {
    useKeyGenStore.getState().setSearchIndex('42');
    expect(useKeyGenStore.getState().searchIndex).toBe('42');
  });
});
