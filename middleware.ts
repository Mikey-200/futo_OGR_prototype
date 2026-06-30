import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always refresh the session so cookies are kept alive
  await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Routes that require an authenticated session
  const protectedPaths = ['/admin', '/results', '/student', '/students', '/faculty'];
  const isProtected = protectedPaths.some(p => path.startsWith(p));

  if (isProtected) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect unauthenticated users to the login page (root)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If logged-in user hits the login root, let it through (the page handles redirect)
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
