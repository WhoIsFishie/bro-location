import type { NormalizedRecord, SmsRecord } from '../types/types';

function parseTimestampToMs(dateStr: string, timeStr: string): number | null {
  // timeStr format example: "15:12:53(UTC+0)" → strip timezone suffix
  const cleanTime = timeStr.replace(/\(UTC.*\)$/i, '');

  // Detect dd/MM/yyyy vs MM/dd/yyyy naively: if first token > 12, treat as dd/MM
  const [d1, d2, d3] = dateStr.split(/[/-]/).map((p) => parseInt(p, 10));
  if (!Number.isFinite(d1) || !Number.isFinite(d2) || !Number.isFinite(d3)) return null;
  const isDMY = d1 > 12;
  const day = isDMY ? d1 : d2;
  const month = (isDMY ? d2 : d1) - 1; // JS months 0-based
  const year = d3 < 100 ? 2000 + d3 : d3;

  const [h, m, s] = cleanTime.split(':').map((p) => parseInt(p, 10));
  if (![h, m, s].every((n) => Number.isFinite(n))) return null;
  const ms = Date.UTC(year, month, day, h, m, s);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

export function normalizeRecord(rec: SmsRecord): NormalizedRecord | null {
  const lat = Number(rec?.location_data?.latitude);
  const lng = Number(rec?.location_data?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = (rec?.party?.name ?? '').toString();
  const phone = (rec?.party?.phone ?? '').toString();
  const direction = (rec?.party?.direction ?? '').toString();
  const message = (rec?.message ?? '').toString();
  const originalDate = rec?.timestamp?.date ?? '';
  const originalTime = (rec?.timestamp?.time ?? '').replace(/\(UTC.*\)$/i, '');

  const timestampMs = parseTimestampToMs(originalDate, originalTime);
  const searchText = `${name} ${phone} ${message}`.toLowerCase();

  return {
    id: Number(rec.id),
    type: rec.type,
    timestampMs,
    originalDate,
    originalTime,
    partyName: name,
    partyPhone: phone,
    partyDirection: direction,
    message,
    latitude: lat,
    longitude: lng,
    searchText,
  };
}

export function normalizeArray(records: SmsRecord[]): NormalizedRecord[] {
  const result: NormalizedRecord[] = [];
  for (const r of records) {
    const n = normalizeRecord(r);
    if (n) result.push(n);
  }
  return result;
}


