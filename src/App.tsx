import { useMemo, useState, useRef, useEffect } from "react";
import "./App.css";
import DataLoader from "./components/DataLoader";
import type { NormalizedRecord } from "./types/types";
import RecordList from "./components/RecordList";
import MapView, { type MapRef } from "./components/MapView";
import NormalizeWorker from "./workers/normalizeWorker.ts?worker";

function App() {
  const [data, setData] = useState<NormalizedRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<MapRef>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "chat">("map");
  const [bootLoading, setBootLoading] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    // Support loading JSON from URL: ?json=<encoded_url>
    const params = new URLSearchParams(window.location.search);
    const jsonUrl = params.get("url") ?? params.get("json");
    if (!jsonUrl) return;
    let cancelled = false;
    async function loadFromUrl() {
      try {
        setBootError(null);
        setBootLoading(true);
        const resp = await fetch(jsonUrl!, { cache: "no-store" });
        if (!resp.ok) throw new Error(`Failed to fetch (${resp.status})`);
        const text = await resp.text();
        const worker = new NormalizeWorker();
        const result: NormalizedRecord[] = await new Promise((resolve, reject) => {
          worker.onmessage = (ev) => {
            if (ev.data?.type === "done") {
              resolve(ev.data.normalized as NormalizedRecord[]);
              worker.terminate();
            } else if (ev.data?.type === "error") {
              reject(new Error(ev.data.message));
              worker.terminate();
            }
          };
          worker.onerror = (e) => {
            reject((e as unknown as Error).message ?? "Worker error");
            worker.terminate();
          };
          worker.postMessage(text);
        });
        if (!cancelled) {
          setData(result);
          setSelectedId(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (!cancelled) setBootError(message);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    }
    loadFromUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: data.length,
      withTime: data.filter((d) => d.timestampMs != null).length,
    };
  }, [data]);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-sm ring-1 ring-blue-300/40">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="3"/>
              <path d="M3 5l7.5 5a3 3 0 003 0L21 5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
              <path d="M18.5 16v5"/>
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight text-slate-800">SMS Location Tracker</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Vite · React · Leaflet</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
        {(bootLoading || fileLoading) && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5">
            <div className="flex items-center gap-2 text-base text-blue-700">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></span>
              {bootLoading ? 'Loading from URL…' : 'Parsing file…'}
            </div>
          </div>
        )}
        {bootError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5">
            <div className="text-sm text-red-700">{bootError}</div>
          </div>
        )}
          {data.length > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5">
              <div className="text-sm text-green-700">
                Raw records: <span className="font-semibold text-green-800">{stats.total}</span>
                <span className="mx-2 text-green-500">·</span>
                Valid: <span className="font-semibold text-green-800">{stats.total}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">
        <aside
          className={
            "border-r border-slate-200 bg-white p-3 shadow-sm min-h-0 overflow-hidden " +
            "md:flex md:flex-col " +
            (data.length === 0
              ? "flex flex-col"
              : mobileTab === "chat"
              ? "flex flex-col pb-14"
              : "hidden")
          }
        >
          <DataLoader
            onLoaded={(d) => {
              setData(d);
              setSelectedId(null);
            }}
            onBusyChange={setFileLoading}
          />
          {data.length > 0 && (
            <div className="mt-4 flex-1 min-h-0 overflow-auto">
              <RecordList
                data={data}
                selectedId={selectedId ?? undefined}
                onSelect={(rec) => {
                  setSelectedId(rec.id);
                  mapRef.current?.flyToLocation(rec.latitude, rec.longitude);
                  if (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) {
                    setMobileTab("map");
                  }
                }}
              />
            </div>
          )}
        </aside>
        <main
          className={
            "p-3 overflow-hidden bg-slate-50 pb-14 md:pb-0 " + // reserve space for bottom nav on mobile
            "md:block " +
            (data.length === 0
              ? "hidden"
              : mobileTab === "chat"
              ? "hidden"
              : "block")
          }
        >
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              {bootLoading || fileLoading ? (
                <div className="flex items-center gap-3 text-slate-600 text-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <div>Loading map, please wait...</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-slate-400 text-lg mb-2">📍</div>
                  <div className="text-slate-500">Load data to view the map</div>
                </div>
              )}
            </div>
          ) : (
            <MapView
              ref={mapRef}
              data={data}
              selectedId={selectedId}
              onSelect={(rec) => setSelectedId(rec.id)}
            />
          )}
        </main>
      </div>
      {/* Mobile bottom nav */}
      {data.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white z-50">
          <div className="grid grid-cols-2">
            <button
              className={
                "h-12 flex items-center justify-center gap-2 text-sm font-medium " +
                (mobileTab === "chat" ? "text-blue-600" : "text-slate-600")
              }
              onClick={() => setMobileTab("chat")}
              aria-label="Show chat list"
            >
              <span>Chat</span>
            </button>
            <button
              className={
                "h-12 flex items-center justify-center gap-2 text-sm font-medium " +
                (mobileTab === "map" ? "text-blue-600" : "text-slate-600")
              }
              onClick={() => setMobileTab("map")}
              aria-label="Show map"
            >
              <span>Map</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;