import { describe, expect, it, vi } from 'vitest';

type FakeResponse = {
  kind: 'next' | 'rewrite';
  url?: URL;
  headers: Map<string, string>;
};

vi.mock('next/server', () => {
  function cloneUrl(u: URL): URL {
    const copy = new URL(u.toString());
    return copy;
  }
  return {
    NextResponse: {
      next: (): FakeResponse => ({ kind: 'next', headers: new Map() }),
      rewrite: (url: URL): FakeResponse => ({
        kind: 'rewrite',
        url: cloneUrl(url),
        headers: new Map(),
      }),
    },
  };
});

import { proxy } from './proxy';

type FakeNextUrl = URL & { clone(): URL };

function buildReq(pathname: string): { nextUrl: FakeNextUrl } {
  const url = new URL(`http://localhost${pathname}`) as FakeNextUrl;
  url.clone = () => new URL(url.toString()) as FakeNextUrl;
  return { nextUrl: url };
}

describe('proxy()', () => {
  it('passes through platform paths unchanged', () => {
    for (const p of ['/super-admin', '/api/foo', '/_next/static/a', '/favicon.ico']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = proxy(buildReq(p) as any) as unknown as FakeResponse;
      expect(res.kind).toBe('next');
    }
  });

  it('passes through non-tenant paths unchanged', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = proxy(buildReq('/onboarding') as any) as unknown as FakeResponse;
    expect(res.kind).toBe('next');
  });

  it('rewrites /c/:slug to /tenant and sets tenant header', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = proxy(buildReq('/c/ana-psi') as any) as unknown as FakeResponse;
    expect(res.kind).toBe('rewrite');
    expect(res.url?.pathname).toBe('/tenant');
    expect(res.headers.get('x-tenant-slug')).toBe('ana-psi');
  });

  it('rewrites /c/:slug/agenda to /tenant/agenda', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = proxy(buildReq('/c/ana-psi/agenda') as any) as unknown as FakeResponse;
    expect(res.kind).toBe('rewrite');
    expect(res.url?.pathname).toBe('/tenant/agenda');
    expect(res.headers.get('x-tenant-slug')).toBe('ana-psi');
  });

  it('rewrites nested sub-paths and preserves slug with hyphens/numbers', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = proxy(buildReq('/c/clinica-lua-2026/pacientes/42') as any) as unknown as FakeResponse;
    expect(res.kind).toBe('rewrite');
    expect(res.url?.pathname).toBe('/tenant/pacientes/42');
    expect(res.headers.get('x-tenant-slug')).toBe('clinica-lua-2026');
  });

  it('passes through bare /c (no slug)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = proxy(buildReq('/c') as any) as unknown as FakeResponse;
    expect(res.kind).toBe('next');
  });
});
