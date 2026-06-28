import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchMetar,
  clearMetarCache,
  displayId,
  formatWind,
  formatVisib,
  formatClouds,
  formatUpdated,
  fltCatColor,
  type MetarResponse,
} from './metar';

const SAMPLE: MetarResponse = {
  icaoId: 'KPDK',
  receiptTime: '2026-06-28T15:56:33.299Z',
  temp: 30,
  wdir: 300,
  wspd: 13,
  wgst: 20,
  visib: '10+',
  fltCat: 'VFR',
  cover: 'CLR',
  clouds: [],
};

function mockApiFetch(data: MetarResponse[]) {
  return vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(data))));
}

beforeEach(() => {
  clearMetarCache();
});

// ─── fetchMetar ───────────────────────────────────────────────────────────────

describe('fetchMetar', () => {
  it('calls the weather API path with the station ID', async () => {
    const apiFetch = mockApiFetch([SAMPLE]);
    await fetchMetar('KPDK', apiFetch);
    expect(apiFetch).toHaveBeenCalledWith('/api/data/metar?ids=KPDK&format=json');
  });

  it('returns the first element of the response array', async () => {
    const result = await fetchMetar('KPDK', mockApiFetch([SAMPLE]));
    expect(result.icaoId).toBe('KPDK');
    expect(result.fltCat).toBe('VFR');
  });

  it('supports responses where wind fields are omitted', async () => {
    const { wdir, wspd, wgst, ...base } = SAMPLE;
    const result = await fetchMetar('KPDK', mockApiFetch([base]));

    expect(result.wdir).toBeUndefined();
    expect(result.wspd).toBeUndefined();
    expect(result.wgst).toBeUndefined();
  });

  it('throws when the response array is empty', async () => {
    await expect(fetchMetar('KPDK', mockApiFetch([]))).rejects.toThrow('No METAR for KPDK');
  });

  it('throws on non-ok HTTP status', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    await expect(fetchMetar('KPDK', apiFetch)).rejects.toThrow('METAR fetch failed: 503');
  });

  it('returns cached data without re-fetching within TTL', async () => {
    const apiFetch = mockApiFetch([SAMPLE]);
    await fetchMetar('KPDK', apiFetch);
    await fetchMetar('KPDK', apiFetch);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the cache TTL expires', async () => {
    const apiFetch = mockApiFetch([SAMPLE]);
    await fetchMetar('KPDK', apiFetch);

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000);
    await fetchMetar('KPDK', apiFetch);

    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});

// ─── displayId ────────────────────────────────────────────────────────────────

describe('displayId', () => {
  it('strips the leading K from a 4-char US ICAO identifier', () => {
    expect(displayId('KPDK')).toBe('PDK');
    expect(displayId('KATL')).toBe('ATL');
  });

  it('leaves non-K or non-4-char identifiers unchanged', () => {
    expect(displayId('EGLL')).toBe('EGLL'); // UK airport
    expect(displayId('PDK')).toBe('PDK');   // already short
  });
});

// ─── formatWind ───────────────────────────────────────────────────────────────

describe('formatWind', () => {
  it('formats direction and speed without gusts', () => {
    expect(formatWind(240, 7)).toBe('240@7');
  });

  it('appends gust when provided', () => {
    expect(formatWind(300, 13, 20)).toBe('300@13G20');
  });

  it('returns Calm when speed is missing or zero', () => {
    expect(formatWind(undefined, undefined)).toBe('Calm');
    expect(formatWind(180, 0)).toBe('Calm');
  });

  it('uses VRB when direction is missing but speed exists', () => {
    expect(formatWind(undefined, 5)).toBe('VRB@5');
  });
});

// ─── formatVisib ──────────────────────────────────────────────────────────────

describe('formatVisib', () => {
  it('strips trailing + and appends SM', () => {
    expect(formatVisib('10+')).toBe('10SM');
  });

  it('appends SM to plain numbers', () => {
    expect(formatVisib('6')).toBe('6SM');
    expect(formatVisib(6)).toBe('6SM');
  });

  it('appends SM to fractional values', () => {
    expect(formatVisib('1/4')).toBe('1/4SM');
  });

  it('leaves values that already contain letters unchanged', () => {
    expect(formatVisib('P6SM')).toBe('P6SM');
  });
});

// ─── formatClouds ─────────────────────────────────────────────────────────────

describe('formatClouds', () => {
  it('returns the cover string when the clouds array is empty', () => {
    expect(formatClouds([], 'CLR')).toBe('CLR');
    expect(formatClouds([], 'SKC')).toBe('SKC');
  });

  it('formats a single cloud layer', () => {
    expect(formatClouds([{ cover: 'FEW', base: 55 }], 'FEW')).toBe('FEW055');
  });

  it('pads the base altitude to three digits', () => {
    expect(formatClouds([{ cover: 'BKN', base: 8 }], 'BKN')).toBe('BKN008');
  });

  it('joins multiple cloud layers with a space', () => {
    expect(
      formatClouds(
        [{ cover: 'FEW', base: 30 }, { cover: 'SCT', base: 60 }],
        'SCT',
      ),
    ).toBe('FEW030 SCT060');
  });
});

// ─── formatUpdated ────────────────────────────────────────────────────────────

describe('formatUpdated', () => {
  it('formats an ISO timestamp as 12-hour local time', () => {
    const localDate = new Date(2026, 5, 28, 10, 56, 33); // Jun 28, 2026 10:56:33 AM local
    const result = formatUpdated(localDate.toISOString());
    expect(result).toBe('10:56a');
  });
});

// ─── fltCatColor ──────────────────────────────────────────────────────────────

describe('fltCatColor', () => {
  it('returns distinct colors for each flight category', () => {
    expect(fltCatColor('VFR')).toBe('#16a34a');
    expect(fltCatColor('MVFR')).toBe('#2563eb');
    expect(fltCatColor('IFR')).toBe('#dc2626');
    expect(fltCatColor('LIFR')).toBe('#7c3aed');
  });

  it('returns gray for an unknown category', () => {
    expect(fltCatColor('UNKNOWN')).toBe('#6b7280');
  });
});
