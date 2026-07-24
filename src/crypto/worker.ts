/**
 * Web Worker for off-main-thread cryptographic computation
 */

import { generateKeyPair } from './mlkem';

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'GENERATE_KEYS') {
    try {
      const result = await generateKeyPair();
      self.postMessage({ type: 'KEYS_GENERATED', payload: result });
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        payload: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
};
