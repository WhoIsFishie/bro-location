/// <reference lib="webworker" />
import type { SmsRecord, NormalizedRecord } from '../types/types';
import { normalizeArray } from '../utils/normalize';

self.onmessage = (e: MessageEvent) => {
  try {
    const text: string = e.data as string;
    const parsed = JSON.parse(text) as SmsRecord[];
    if (!Array.isArray(parsed)) throw new Error('JSON root must be an array');
    const normalized: NormalizedRecord[] = normalizeArray(parsed);
    // Post back in chunks to avoid large transfer blocking
    self.postMessage({ type: 'done', normalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    self.postMessage({ type: 'error', message });
  }
};


