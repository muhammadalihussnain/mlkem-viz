// Store tests updated for new step-by-step store
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/keygenStore';

describe('useStore', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('initial state is null for all stages', () => {
    const s = useStore.getState();
    expect(s.aliceKey).toBeNull();
    expect(s.aliceNtt).toBeNull();
    expect(s.aliceT).toBeNull();
    expect(s.aliceEnc).toBeNull();
    expect(s.alicePubKey).toBeNull();
    expect(s.bobA).toBeNull();
    expect(s.bobUV).toBeNull();
    expect(s.bobCompress).toBeNull();
    expect(s.aliceSTU).toBeNull();
    expect(s.aliceDecap).toBeNull();
    expect(s.compare).toBeNull();
    expect(s.busy).toBe(false);
  });

  it('reset clears all state', () => {
    useStore.getState().setBusy(true);
    useStore.getState().reset();
    expect(useStore.getState().busy).toBe(false);
  });
});
