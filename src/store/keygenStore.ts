/**
 * State management for key generation results
 */

import { create } from 'zustand';
import type { KeyGenResult, CoefficientRow } from '../crypto/types';

interface KeyGenStore {
  result: KeyGenResult | null;
  rows: CoefficientRow[];
  isGenerating: boolean;
  error: string | null;
  filterRange: [number, number];
  searchIndex: string;
  setResult: (result: KeyGenResult) => void;
  setGenerating: (v: boolean) => void;
  setError: (e: string | null) => void;
  setFilterRange: (r: [number, number]) => void;
  setSearchIndex: (v: string) => void;
}

function buildRows(result: KeyGenResult): CoefficientRow[] {
  return Array.from({ length: 256 }, (_, i) => ({
    index: i,
    s0: result.secretVector.s0[i],
    s1: result.secretVector.s1[i],
    a00: result.matrixA[0][0][i],
    a01: result.matrixA[0][1][i],
    a10: result.matrixA[1][0][i],
    a11: result.matrixA[1][1][i],
    as0: result.asIntermediate[0][i],
    as1: result.asIntermediate[1][i],
    t_poly0: result.rawT[0][i],
    t_poly1: result.rawT[1][i],
    t1_p0: result.encodedT1[0][i],
    t0_p0: result.encodedT0[0][i],
    t1_p1: result.encodedT1[1][i],
    t0_p1: result.encodedT0[1][i],
  }));
}

export const useKeyGenStore = create<KeyGenStore>((set) => ({
  result: null,
  rows: [],
  isGenerating: false,
  error: null,
  filterRange: [0, 3328],
  searchIndex: '',
  setResult: (result) => set({ result, rows: buildRows(result), error: null }),
  setGenerating: (v) => set({ isGenerating: v }),
  setError: (e) => set({ error: e, isGenerating: false }),
  setFilterRange: (r) => set({ filterRange: r }),
  setSearchIndex: (v) => set({ searchIndex: v }),
}));
