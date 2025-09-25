import { useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedRecord } from '../types/types';

type Props = {
  data: NormalizedRecord[];
  selectedId?: number | null;
  onSelect?: (rec: NormalizedRecord) => void;
};

export default function RecordList({ data, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => d.searchText.includes(q));
  }, [data, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0));
  }, [filtered]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`button[data-id='${selectedId}']`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <input
          className="w-full px-4 py-2 pr-10 border-2 border-slate-300 rounded-lg bg-white text-slate-900 text-sm placeholder-slate-500 placeholder:text-xs shadow-sm focus:outline-none focus:ring-0 focus:border-primary-500 hover:border-slate-400 transition-all"
            placeholder="Search messages, names, or numbers."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium mt-3 text-right">{sorted.length} result(s)</div>
      </div>
      <div ref={listRef} className="space-y-2 max-h-[70vh] overflow-auto">
        {sorted.map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <button
              key={m.id}
              data-id={m.id}
              onClick={() => onSelect?.(m)}
              className={`w-full text-left rounded-lg border-2 p-3 transition-all duration-200 shadow-sm ${
                isSelected
                  ? 'bg-primary-50 border-primary-500 shadow-lg'
                  : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">{m.partyName}</span>
                <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">({m.partyPhone})</span>
              </div>
              <div className="text-xs text-slate-600 mb-2 font-medium">
                {m.originalDate} {m.originalTime}
              </div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{m.message}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

