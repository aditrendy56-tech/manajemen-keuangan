import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ⚠️ TEMPORARY: Middleware disabled for testing
  // TODO: Re-enable after Supabase auth setup
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
