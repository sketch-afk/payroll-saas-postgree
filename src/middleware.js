import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // If authenticated and trying to access auth pages, redirect to dashboard
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (token && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes
        if (pathname === '/login' || pathname === '/register' || pathname === '/') return true;
        if (pathname.startsWith('/api/auth'))      return true;
        if (pathname.startsWith('/api/companies')) return true;
        
        // Everything else needs auth
        return !!token;
      },
    },
  }
);

export const config = {
  // Optimized matcher: skips standard Next.js internals AND common public image formats
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};