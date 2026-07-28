/**
 * Step-by-step state store for ML-KEM-512 demo
 */

import { create } from 'zustand';
import type {
  AliceKeyStage, AliceNttStage, AliceTStage, AliceEncStage, AlicePubKeyStage,
  BobAStage, BobUVStage, BobCompressStage,
  AliceSTUStage, AliceDecapStage, CompareStage,
} from '../crypto/types';

interface Store {
  // Alice stages
  aliceKey:    AliceKeyStage    | null;
  aliceNtt:    AliceNttStage    | null;
  aliceT:      AliceTStage      | null;
  aliceEnc:    AliceEncStage    | null;
  alicePubKey: AlicePubKeyStage | null;

  // Bob stages
  bobA:        BobAStage        | null;
  bobUV:       BobUVStage       | null;
  bobCompress: BobCompressStage | null;

  // Alice decap
  aliceSTU:    AliceSTUStage    | null;
  aliceDecap:  AliceDecapStage  | null;
  compare:     CompareStage     | null;

  // busy flag
  busy: boolean;

  // setters
  setAliceKey:    (v: AliceKeyStage)    => void;
  setAliceNtt:    (v: AliceNttStage)    => void;
  setAliceT:      (v: AliceTStage)      => void;
  setAliceEnc:    (v: AliceEncStage)    => void;
  setAlicePubKey: (v: AlicePubKeyStage) => void;
  setBobA:        (v: BobAStage)        => void;
  setBobUV:       (v: BobUVStage)       => void;
  setBobCompress: (v: BobCompressStage) => void;
  setAliceSTU:    (v: AliceSTUStage)    => void;
  setAliceDecap:  (v: AliceDecapStage)  => void;
  setCompare:     (v: CompareStage)     => void;
  setBusy:        (v: boolean)          => void;
  reset:          ()                    => void;
}

const init = {
  aliceKey: null, aliceNtt: null, aliceT: null, aliceEnc: null, alicePubKey: null,
  bobA: null, bobUV: null, bobCompress: null,
  aliceSTU: null, aliceDecap: null, compare: null,
  busy: false,
};

export const useStore = create<Store>((set) => ({
  ...init,
  setAliceKey:    (v) => set({ aliceKey:    v }),
  setAliceNtt:    (v) => set({ aliceNtt:    v }),
  setAliceT:      (v) => set({ aliceT:      v }),
  setAliceEnc:    (v) => set({ aliceEnc:    v }),
  setAlicePubKey: (v) => set({ alicePubKey: v }),
  setBobA:        (v) => set({ bobA:        v }),
  setBobUV:       (v) => set({ bobUV:       v }),
  setBobCompress: (v) => set({ bobCompress: v }),
  setAliceSTU:    (v) => set({ aliceSTU:    v }),
  setAliceDecap:  (v) => set({ aliceDecap:  v }),
  setCompare:     (v) => set({ compare:     v }),
  setBusy:        (v) => set({ busy:        v }),
  reset:          ()  => set({ ...init }),
}));
