import { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Popup, useMapEvents, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NormalizedRecord } from '../types/types';

type Props = {
  data: NormalizedRecord[];
  selectedId?: number | null;
  onSelect?: (rec: NormalizedRecord) => void;
};

export type MapRef = {
  flyToLocation: (lat: number, lng: number) => void;
};

// Fix default marker icons in Leaflet when used with bundlers
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function useViewportBounds() {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useMapEvents({
    moveend: useCallback((e: L.LeafletEvent) => {
      setBounds((e.target as L.Map).getBounds());
    }, []),
    zoomend: useCallback((e: L.LeafletEvent) => {
      setBounds((e.target as L.Map).getBounds());
    }, []),
  });

  return bounds;
}

function useProgressiveMarkers(data: NormalizedRecord[], batchSize: number = 200) {
  const [visibleMarkers, setVisibleMarkers] = useState<NormalizedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (data.length === 0) {
      setVisibleMarkers([]);
      return;
    }

    setIsLoading(true);
    setVisibleMarkers([]);

    let currentIndex = 0;
    let timeoutId: number;

    const loadBatch = () => {
      const nextBatch = data.slice(currentIndex, currentIndex + batchSize);
      setVisibleMarkers(prev => [...prev, ...nextBatch]);
      currentIndex += batchSize;

      if (currentIndex < data.length) {
        // Use larger batches and shorter delays for faster loading
        timeoutId = window.setTimeout(loadBatch, 5);
      } else {
        setIsLoading(false);
      }
    };

    // Start loading immediately
    loadBatch();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [data, batchSize]);

  return { visibleMarkers, isLoading };
}

function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

const MapView = forwardRef<MapRef, Props>(({ data, selectedId, onSelect }, ref) => {
  const center = [4.1755, 73.5093] as [number, number];
  const zoom = 5;
  const { visibleMarkers, isLoading } = useProgressiveMarkers(data, 500);
  const mapRef = useRef<L.Map | null>(null);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  useImperativeHandle(ref, () => ({
    flyToLocation: (lat: number, lng: number) => {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 18, { duration: 0.6 });
      }
    }
  }), []);

  function ProgressiveMarkers() {
    const bounds = useViewportBounds();
    const selectedPopupRef = useRef<L.Popup | null>(null);

    useEffect(() => {
      if (selectedId != null && selectedPopupRef.current && mapRef.current) {
        selectedPopupRef.current.openOn(mapRef.current);
      }
    }, []);

    const visibleInViewport = useMemo(() => {
      if (!bounds) return visibleMarkers.slice(0, 800); // initial cap
      // Only render markers in viewport plus padding for better performance
      const padded = bounds.pad(0.3);
      const filtered = visibleMarkers.filter(marker =>
        padded.contains(L.latLng(marker.latitude, marker.longitude))
      );
      // Spatial sampling to avoid overdraw; ensure selected stays
      const MAX = 900;
      if (filtered.length <= MAX) return filtered;
      const step = Math.ceil(filtered.length / MAX);
      const sampled: NormalizedRecord[] = [];
      for (let i = 0; i < filtered.length; i += step) sampled.push(filtered[i]);
      if (selectedId != null) {
        const present = sampled.some(r => r.id === selectedId);
        if (!present) {
          const sel = filtered.find(r => r.id === selectedId);
          if (sel) sampled.push(sel);
        }
      }
      return sampled;
    }, [bounds]);

    return (
      <>
        {visibleInViewport
          .filter(rec => rec.id !== selectedId)
          .map((rec) => (
            <CircleMarker
              key={rec.id}
              center={[rec.latitude, rec.longitude] as L.LatLngExpression}
              radius={5}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#0ea5e9',
                fillOpacity: 0.7,
                weight: 1
              }}
              eventHandlers={{
                click: () => {
                  onSelect?.(rec);
                  if (mapRef.current) {
                    mapRef.current.flyTo([rec.latitude, rec.longitude], 18, { duration: 0.6 });
                  }
                }
              }}
            >
              <Popup maxWidth={800} className="!max-w-none">
                <div className="text-sm min-w-[260px] p-1">
                  <div className="font-semibold mb-2 text-slate-800">{rec.partyName}</div>
                  <div className="text-slate-600 mb-2 font-mono text-xs">{rec.partyPhone}</div>
                  <div className="mb-3 text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{rec.message}</div>
                  <div className="text-xs text-slate-500 font-medium border-t border-slate-200 pt-2">{rec.originalDate} {rec.originalTime}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        {selectedId != null && (() => {
          const sel = visibleInViewport.find(r => r.id === selectedId);
          if (!sel) return null;
          return (
            <>
              <CircleMarker
                key={`sel-${sel.id}`}
                center={[sel.latitude, sel.longitude] as L.LatLngExpression}
                radius={9}
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  weight: 3
                }}
              />
              <Popup
                key={`popup-${sel.id}`}
                position={[sel.latitude, sel.longitude] as L.LatLngExpression}
                maxWidth={800}
                className="!max-w-none"
                ref={(p) => {
                  selectedPopupRef.current = (p as unknown as L.Popup) ?? null;
                }}
              >
                <div className="text-sm min-w-[260px] p-1">
                  <div className="font-semibold mb-2 text-slate-800">{sel.partyName}</div>
                  <div className="text-slate-600 mb-2 font-mono text-xs">{sel.partyPhone}</div>
                  <div className="mb-3 text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{sel.message}</div>
                  <div className="text-xs text-slate-500 font-medium border-t border-slate-200 pt-2">{sel.originalDate} {sel.originalTime}</div>
                </div>
              </Popup>
            </>
          );
        })()}
      </>
    );
  }

  return (
    <div className="h-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
      {isLoading && (
        <div className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-md px-3 py-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Loading markers... ({visibleMarkers.length}/{data.length})
          </div>
        </div>
      )}
      <MapContainer center={center} zoom={zoom} preferCanvas className="h-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController onMapReady={handleMapReady} />
        <ProgressiveMarkers />
      </MapContainer>
    </div>
  );
});

export default MapView;

