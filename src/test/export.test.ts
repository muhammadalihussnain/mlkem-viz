import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToExcel } from '../utils/export';

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls alert with coming soon message', () => {
    exportToExcel();
    expect(alert).toHaveBeenCalledOnce();
    expect(alert).toHaveBeenCalledWith(
      'Export feature coming soon — being redesigned for step-by-step flow'
    );
  });
});
