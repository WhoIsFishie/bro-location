import { useState } from 'react';
import type { NormalizedRecord } from '../types/types';
import NormalizeWorker from '../workers/normalizeWorker.ts?worker';

type Props = {
  onLoaded: (data: NormalizedRecord[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function DataLoader({ onLoaded, onBusyChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('No file chosen');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError('Please select a .json file');
      return;
    }
    setError(null);
    setSelectedFileName(file.name);
    setIsBusy(true);
    onBusyChange?.(true);
    try {
      const text = await file.text();
      // Use web worker for heavy parsing/normalization
      const worker = new NormalizeWorker();
      const result: NormalizedRecord[] = await new Promise((resolve, reject) => {
        worker.onmessage = (ev) => {
          if (ev.data?.type === 'done') {
            resolve(ev.data.normalized as NormalizedRecord[]);
            worker.terminate();
          } else if (ev.data?.type === 'error') {
            reject(new Error(ev.data.message));
            worker.terminate();
          }
        };
        worker.onerror = (e) => {
          reject(e.message);
          worker.terminate();
        };
        worker.postMessage(text);
      });
      onLoaded(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Load SMS Data
        </label>
        <div className="relative">
          <div className="w-full h-10 bg-blue-500 hover:bg-blue-600 border border-blue-500 rounded-lg flex items-center justify-center px-3 text-sm text-white font-medium cursor-pointer transition-colors">
            {selectedFileName === 'No file chosen' ? 'Choose JSON File' : selectedFileName}
          </div>
          <input
            aria-label="Choose JSON file"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>
      {isBusy && (
        <div className="flex items-center text-sm text-primary-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
          Parsing…
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
    </div>
  );
}