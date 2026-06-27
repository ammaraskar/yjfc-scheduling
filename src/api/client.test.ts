import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from './client';

describe('createClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
  });

  it('encodes the target URL into the proxy URL', async () => {
    const apiFetch = createClient('https://proxy.example.com/', 'https://api.example.com');
    await apiFetch('/foo');
    expect(fetch).toHaveBeenCalledWith(
      'https://proxy.example.com/?url=https%3A%2F%2Fapi.example.com%2Ffoo',
      undefined,
    );
  });

  it('passes init options through to fetch', async () => {
    const apiFetch = createClient('https://proxy.example.com/', 'https://api.example.com');
    const init: RequestInit = { method: 'POST', body: 'test', redirect: 'manual' };
    await apiFetch('/endpoint', init);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), init);
  });
});
