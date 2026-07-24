/**
 * State management for key generation and encapsulation results
 */

import { create } from 'zustand';
import type { KeyGenResult, CoefficientRow, EncapResult, EncapRow } from '../crypto/types';
import { buildEncapRows } from '../crypto/encapsulate';

interface KeyGenStore {
  result: KeyGenResult | null;
  rows: CoefficientRow[];
  encapResult: EncapResult | null;
  encapRows: EncapRow[];
  isGenerating: boolean;
  isEncapsulating: boolean;
  error: string | null;
  filterRange: [number, number];
  searchIndex: string;
  setResult: (result: KeyGenResult) => void;
  setEncapResult: (enc: EncapResult) => void;
  setGenerating: (v: boolean) => void;
  setEncapsulating: (v: boolean) => void;
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
    nttA00: result.nttA[0][0][i],
    nttA01: result.nttA[0][1][i],
    nttA10: result.nttA[1][0][i],
    nttA11: result.nttA[1][1][i],
    nttS0: result.nttS[0][i],
    nttS1: result.nttS[1][i],
    nttProd0: result.nttProduct[0][i],
    nttProd1: result.nttProduct[1][i],
    as0: result.asIntermediate[0][i],
    as1: result.asIntermediate[1][i],
    t_poly0: result.rawT[0][i],
    t_poly1: result.rawT[1][i],
    enc0: result.encodedT1[0][i],
    enc1: result.encodedT1[1][i],
  }));
}

export const useKeyGenStore = create<KeyGenStore>((set) => ({
  result: null,
  rows: [],
  encapResult: null,
  encapRows: [],
  isGenerating: false,
  isEncapsulating: false,
  error: null,
  filterRange: [0, 3328],
  searchIndex: '',
  setResult: (result) => set({ result, rows: buildRows(result), error: null }),
  setEncapResult: (enc) => set({ encapResult: enc, encapRows: buildEncapRows(enc) }),
  setGenerating: (v) => set({ isGenerating: v }),
  setEncapsulating: (v) => set({ isEncapsulating: v }),
  setError: (e) => set({ error: e, isGenerating: false, isEncapsulating: false }),
  setFilterRange: (r) => set({ filterRange: r }),
  setSearchIndex: (v) => set({ searchIndex: v }),
}));
