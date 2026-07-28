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

  it('setAliceKey stores value', () => {
    const v = { rho: new Uint8Array(32), s0: [], s1: [], A00: [], A01: [], A10: [], A11: [] };
    useStore.getState().setAliceKey(v as any);
    expect(useStore.getState().aliceKey).toBe(v);
  });

  it('setAliceNtt stores value', () => {
    const v = { nttA00: [], nttA01: [], nttA10: [], nttA11: [], nttS0: [], nttS1: [], AS0: [], AS1: [] };
    useStore.getState().setAliceNtt(v as any);
    expect(useStore.getState().aliceNtt).toBe(v);
  });

  it('setAliceT stores value', () => {
    const v = { e0: [], e1: [], t0: [], t1: [] };
    useStore.getState().setAliceT(v as any);
    expect(useStore.getState().aliceT).toBe(v);
  });

  it('setAliceEnc stores value', () => {
    const v = { t0enc: [], t1enc: [] };
    useStore.getState().setAliceEnc(v as any);
    expect(useStore.getState().aliceEnc).toBe(v);
  });

  it('setAlicePubKey stores value', () => {
    const v = { publicKey: new Uint8Array(800) };
    useStore.getState().setAlicePubKey(v);
    expect(useStore.getState().alicePubKey).toBe(v);
  });

  it('setBobA stores value', () => {
    const v = { bobA00: [], bobA01: [], bobA10: [], bobA11: [], aMatch: true };
    useStore.getState().setBobA(v as any);
    expect(useStore.getState().bobA).toBe(v);
  });

  it('setBobUV stores value', () => {
    const v = { m: new Uint8Array(32) } as any;
    useStore.getState().setBobUV(v);
    expect(useStore.getState().bobUV).toBe(v);
  });

  it('setBobCompress stores value', () => {
    const v = { U0c: [], U1c: [], Vc: [] };
    useStore.getState().setBobCompress(v as any);
    expect(useStore.getState().bobCompress).toBe(v);
  });

  it('setAliceSTU stores value', () => {
    const v = { nttU0: [], nttU1: [], sTU: [] };
    useStore.getState().setAliceSTU(v as any);
    expect(useStore.getState().aliceSTU).toBe(v);
  });

  it('setAliceDecap stores value', () => {
    const v = { w: [], noise: [], recovered: [], recoveredBytes: new Uint8Array(32) };
    useStore.getState().setAliceDecap(v as any);
    expect(useStore.getState().aliceDecap).toBe(v);
  });

  it('setCompare stores value', () => {
    const v = { bobBits: [], aliceBits: [], errCount: 0 };
    useStore.getState().setCompare(v);
    expect(useStore.getState().compare).toBe(v);
  });

  it('setBusy toggles busy flag', () => {
    useStore.getState().setBusy(true);
    expect(useStore.getState().busy).toBe(true);
    useStore.getState().setBusy(false);
    expect(useStore.getState().busy).toBe(false);
  });

  it('reset after setting multiple stages clears everything', () => {
    const s = useStore.getState();
    s.setBusy(true);
    s.setAliceKey({ rho: new Uint8Array(32), s0: [], s1: [], A00: [], A01: [], A10: [], A11: [] } as any);
    s.setBobA({ bobA00: [], bobA01: [], bobA10: [], bobA11: [], aMatch: true } as any);
    s.reset();
    const after = useStore.getState();
    expect(after.busy).toBe(false);
    expect(after.aliceKey).toBeNull();
    expect(after.bobA).toBeNull();
  });
});
