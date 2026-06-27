import { describe, it, expect, vi } from 'vitest';
import { login } from './auth';

const SCHEDULE_URL = 'https://my.schedulemaster.com/SCHEDULE4.aspx?USERID=148772&SESSION=4CA18F24-DA78-4DB3-B1CA-FC0DF4D00B7A';

function stubFetch(status: number, headers: Record<string, string> = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status, headers })));
}

describe('login', () => {
  it('posts form-encoded data to /login.asp', async () => {
    stubFetch(200, { 'x-final-location': SCHEDULE_URL });
    await login('aaskar', 'secret');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('%2Flogin.asp'),
      expect.objectContaining({
        method: 'POST',
        body: 'USERID=aaskar&DATA=secret&CMD=LOGIN',
      }),
    );
  });

  it('extracts userid and session from x-final-location', async () => {
    stubFetch(200, { 'x-final-location': SCHEDULE_URL });
    const result = await login('aaskar', 'secret');
    expect(result).toEqual({ userid: '148772', session: '4CA18F24-DA78-4DB3-B1CA-FC0DF4D00B7A' });
  });

  it('throws when x-final-location header is missing', async () => {
    stubFetch(200);
    await expect(login('aaskar', 'wrong')).rejects.toThrow('Login failed');
  });

  it('throws when USERID or SESSION are missing from the redirect', async () => {
    stubFetch(200, { 'x-final-location': 'https://my.schedulemaster.com/error.asp' });
    await expect(login('aaskar', 'wrong')).rejects.toThrow('Login failed');
  });
});
