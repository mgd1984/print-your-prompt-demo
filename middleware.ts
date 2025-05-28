import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log('🚀 Middleware file loaded!');

export function middleware(request: NextRequest) {
  console.log('🔥 MIDDLEWARE EXECUTED:', request.nextUrl.pathname);
  
  if (request.nextUrl.pathname === '/admin') {
    console.log('🔥 REDIRECTING ADMIN');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin'
}; 