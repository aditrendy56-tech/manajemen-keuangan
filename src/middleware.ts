import { NextResponse, type NextRequest } from 'next/server';

// Middleware currently disabled - causing routing issues
// TODO: Implement proper auth handling when Supabase is ready

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Temporarily disable matcher to fix routing
export const config = {
  matcher: [],
};
