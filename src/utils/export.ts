/**
 * Export functionality for Excel/CSV
 */

import * as XLSX from 'xlsx';
import type { KeyGenResult } from '../crypto/types';

export function exportToExcel(result: KeyGenResult) {
  const wb = XLSX.utils.book_new();

  // Matrix A worksheet
  const matrixAData = [
    ['Index', 'A[0][0]', 'A[0][1]', 'A[1][0]', 'A[1][1]'],
    ...Array.from({ length: 256 }, (_, i) => [
      i,
      result.matrixA[0][0][i],
      result.matrixA[0][1][i],
      result.matrixA[1][0][i],
      result.matrixA[1][1][i],
    ]),
  ];
  const wsMatrixA = XLSX.utils.aoa_to_sheet(matrixAData);
  XLSX.utils.book_append_sheet(wb, wsMatrixA, 'Matrix_A_16bit');

  // AS Intermediate worksheet
  const asData = [
    ['Index', 'AS[0]', 'AS[1]'],
    ...Array.from({ length: 256 }, (_, i) => [
      i,
      result.asIntermediate[0][i],
      result.asIntermediate[1][i],
    ]),
  ];
  const wsAS = XLSX.utils.aoa_to_sheet(asData);
  XLSX.utils.book_append_sheet(wb, wsAS, 'AS_Intermediate_16bit');

  // Raw t worksheet
  const rawTData = [
    ['Index', 't[0] (AS+e)', 't[1] (AS+e)'],
    ...Array.from({ length: 256 }, (_, i) => [
      i,
      result.rawT[0][i],
      result.rawT[1][i],
    ]),
  ];
  const wsRawT = XLSX.utils.aoa_to_sheet(rawTData);
  XLSX.utils.book_append_sheet(wb, wsRawT, 'AS+e_Raw_t_16bit');

  // Encoded t1 worksheet
  const t1Data = [
    ['Index', 't1[0] (12-bit)', 't1[1] (12-bit)'],
    ...Array.from({ length: 256 }, (_, i) => [
      i,
      result.encodedT1[0][i],
      result.encodedT1[1][i],
    ]),
  ];
  const wsT1 = XLSX.utils.aoa_to_sheet(t1Data);
  XLSX.utils.book_append_sheet(wb, wsT1, 't1_Encoded_12bit');

  // Encoded t0 worksheet
  const t0Data = [
    ['Index', 't0[0] (12-bit)', 't0[1] (12-bit)'],
    ...Array.from({ length: 256 }, (_, i) => [
      i,
      result.encodedT0[0][i],
      result.encodedT0[1][i],
    ]),
  ];
  const wsT0 = XLSX.utils.aoa_to_sheet(t0Data);
  XLSX.utils.book_append_sheet(wb, wsT0, 't0_Encoded_12bit');

  // Statistics worksheet
  const statsData = [
    ['Memory Footprint', ''],
    ['Matrix A (4 polynomials)', '2048 bytes'],
    ['AS Intermediate', '512 bytes'],
    ['Raw t (AS+e)', '512 bytes'],
    ['Encoded t1', '384 bytes'],
    ['Encoded t0', '384 bytes'],
    ['Total', '3840 bytes'],
    [''],
    ['Performance Metrics', ''],
    ['NTT Time', `${result.timing.nttTime.toFixed(2)} ms`],
    ['Matrix Multiplication Time', `${result.timing.matrixMultTime.toFixed(2)} ms`],
    ['Error Addition Time', `${result.timing.errorAddTime.toFixed(2)} ms`],
    ['Encoding Time', `${result.timing.encodingTime.toFixed(2)} ms`],
    ['Total Time', `${result.timing.totalTime.toFixed(2)} ms`],
  ];
  const wsStats = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics_Summary');

  // Write file
  XLSX.writeFile(wb, `mlkem512_keygen_${Date.now()}.xlsx`);
}
