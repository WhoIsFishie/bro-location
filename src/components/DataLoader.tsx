import { useState } from 'react';
import type { NormalizedRecord } from '../types/types';
import NormalizeWorker from '../workers/normalizeWorker.ts?worker';

type Props = {
  onLoaded: (data: NormalizedRecord[]) => void;
};

// Add this function to handle JSON URL fetching
async function fetchJsonFromUrl(jsonUrl: string) {
  try {
    const url = new URL(jsonUrl);

    const response = await fetch(jsonUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      mode: 'cors'
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('JSON file not found. Please check the URL and try again.');
      } else if (response.status === 403) {
        throw new Error('JSON file access denied.');
      } else {
        throw new Error(`Failed to fetch JSON data (${response.status})`);
      }
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('JSON file is empty or contains no data');
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw new Error('File does not contain valid JSON data');
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('CORS')) {
      throw new Error(
        'JSON file cannot be fetched due to CORS restrictions. ' +
        'Please ensure the server allows cross-origin requests or download the file manually.'
      );
    }
    throw error;
  }
}

export default function DataLoader({ onLoaded }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('No file chosen');
  const [urlInput, setUrlInput] = useState<string>('');

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
    try {
      const text = await file.text();
      await processJsonData(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    setError(null);
    setIsBusy(true);
    try {
      const data = await fetchJsonFromUrl(urlInput.trim());
      const jsonText = JSON.stringify(data);
      await processJsonData(jsonText);
      setSelectedFileName(`URL: ${urlInput}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function processJsonData(jsonText: string): Promise<void> {
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
      worker.postMessage(jsonText);
    });
    onLoaded(result);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Load Location Data
        </label>
        
        {/* File Upload */}
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

        {/* URL Input */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-500">or</span>
          </div>
        </div>

        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Enter JSON URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isBusy}
            className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isBusy || !urlInput.trim()}
            className="w-full h-10 bg-slate-500 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-white font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load from URL
          </button>
        </form>
      </div>

      {isBusy && (
        <div className="flex items-center text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          {selectedFileName.startsWith('URL:') ? 'Loading from URL...' : 'Parsing file...'}
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