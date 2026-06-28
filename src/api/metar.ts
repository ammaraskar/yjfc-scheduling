import { createClient } from './client';
import type { ApiFetch } from './client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const weatherClient: ApiFetch = createClient(
  'https://sm-cors-proxy.ammar-askar.workers.dev/',
  'https://aviationweather.gov',
);

export interface MetarCloud {
  cover: string;
  base: number;
}

export interface MetarResponse {
  icaoId: string;
  receiptTime: string;
  temp: number;
  wdir: number;
  wspd: number;
  wgst?: number;
  visib: string | number;
  fltCat: string;
  cover: string;
  clouds: MetarCloud[];
}

interface CacheEntry {
  data: MetarResponse;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function clearMetarCache(): void {
  cache.clear();
}

export async function fetchMetar(
  stationId: string,
  apiFetch: ApiFetch = weatherClient,
): Promise<MetarResponse> {
  const now = Date.now();
  const cached = cache.get(stationId);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await apiFetch(`/api/data/metar?ids=${stationId}&format=json`);
  if (!res.ok) throw new Error(`METAR fetch failed: ${res.status}`);
  const rows: MetarResponse[] = await res.json();
  if (!rows.length) throw new Error(`No METAR for ${stationId}`);

  const data = rows[0];
  cache.set(stationId, { data, fetchedAt: now });
  return data;
}

export function displayId(icaoId: string): string {
  return icaoId.startsWith('K') && icaoId.length === 4 ? icaoId.slice(1) : icaoId;
}

export function formatWind(wdir: number, wspd: number, wgst?: number): string {
  return wgst ? `${wdir}@${wspd}G${wgst}` : `${wdir}@${wspd}`;
}

export function formatVisib(visib: string | number): string {
  // Strip trailing "+" (API sends "10+" meaning ≥10SM) and append SM
  const s = String(visib).replace('+', '');
  if (/[a-zA-Z]/.test(s)) return s;
  return `${s}SM`;
}

export function formatClouds(clouds: MetarCloud[], cover: string): string {
  if (!clouds.length) return cover;
  return clouds.map(c => `${c.cover}${String(c.base).padStart(3, '0')}`).join(' ');
}

export function formatUpdated(receiptTime: string): string {
  const d = new Date(receiptTime);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = d.getHours() < 12 ? 'a' : 'p';
  return `${h}:${m}${s}`;
}

export function fltCatColor(cat: string): string {
  switch (cat) {
    case 'VFR':  return '#16a34a';
    case 'MVFR': return '#2563eb';
    case 'IFR':  return '#dc2626';
    case 'LIFR': return '#7c3aed';
    default:     return '#6b7280';
  }
}
