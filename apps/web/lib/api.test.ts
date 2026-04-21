import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getIdToken = vi.fn();
const getFirebaseAuth = vi.fn();

vi.mock('./firebase', () => ({
  getFirebaseAuth: () => getFirebaseAuth(),
}));

import { api, ApiError } from './api';

const originalFetch = globalThis.fetch;

function mockFetchOnce(init: {
  ok: boolean;
  status: number;
  body: unknown;
  statusText?: string;
}): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async () => ({
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    text: async () => (init.body === null || init.body === undefined ? '' : JSON.stringify(init.body)),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = mock;
  return mock;
}

describe('api()', () => {
  beforeEach(() => {
    getIdToken.mockReset();
    getFirebaseAuth.mockReset();
    getFirebaseAuth.mockReturnValue({
      currentUser: { getIdToken },
    });
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = originalFetch;
  });

  it('throws ApiError 401 when no current user is signed in', async () => {
    getFirebaseAuth.mockReturnValue({ currentUser: null });
    await expect(api('/tenants', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      message: 'Não autenticado',
    });
  });

  it('skips auth when authed:false', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { ok: true } });
    await api('/health', { authed: false });
    const call = fetchMock.mock.calls[0]!;
    const headers = call[1].headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
    expect(getFirebaseAuth).not.toHaveBeenCalled();
  });

  it('attaches Bearer token and JSON content type on authed calls', async () => {
    getIdToken.mockResolvedValue('tok-123');
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { id: 't-1' } });

    const result = await api<{ id: string }>('/tenants', { method: 'POST', body: '{}' });

    expect(result).toEqual({ id: 't-1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:3333/v1/tenants');
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok-123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with the server message when response is not ok', async () => {
    getIdToken.mockResolvedValue('tok-123');
    mockFetchOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      body: { message: 'Slug em uso' },
    });

    await expect(api('/tenants', { method: 'POST' })).rejects.toMatchObject({
      status: 409,
      message: 'Slug em uso',
    });
  });

  it('falls back to statusText when error body has no message', async () => {
    getIdToken.mockResolvedValue('tok-123');
    mockFetchOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      body: null,
    });

    try {
      await api('/tenants');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).toBe('Internal Server Error');
    }
  });

  it('returns null for empty successful bodies', async () => {
    getIdToken.mockResolvedValue('tok-123');
    mockFetchOnce({ ok: true, status: 204, body: null });
    const result = await api('/tenants/1', { method: 'DELETE' });
    expect(result).toBeNull();
  });
});
