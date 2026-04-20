import { NextResponse, type NextRequest } from 'next/server';

const TENANT_HEADER = 'x-tenant-slug';
const PLATFORM_PATHS = ['/super-admin', '/api', '/_next', '/favicon.ico'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PLATFORM_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const match = pathname.match(/^\/c\/([^/]+)(\/.*)?$/);
  const slug = match?.[1];
  if (!slug) {
    return NextResponse.next();
  }
  const rest = match?.[2] ?? '/';

  const url = req.nextUrl.clone();
  url.pathname = rest === '/' ? '/tenant' : `/tenant${rest}`;

  const res = NextResponse.rewrite(url);
  res.headers.set(TENANT_HEADER, slug);
  return res;
}
