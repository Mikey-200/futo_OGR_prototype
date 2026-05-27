import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  const isProtectedPath = path.startsWith('/admin') || path.startsWith('/faculty') || path.startsWith('/student');

  if (isProtectedPath) {
    // Refresh session and get user
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log(`\n[MIDDLEWARE DEBUG] Evaluated Path: ${path}`);
    console.log(`[MIDDLEWARE DEBUG] Auth User UUID: ${user?.id || 'null'}`);

    if (error) {
      console.log(`[MIDDLEWARE DEBUG] Auth Error: ${error.message}`);
    }

    if (!user) {
      console.log(`[MIDDLEWARE DEBUG] No active session. Redirecting to login.`);
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // Fetch user payload
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log(`[MIDDLEWARE DEBUG] Public Users Payload:`, userData);
    if (userError) {
      console.log(`[MIDDLEWARE DEBUG] Public Users Fetch Error:`, userError.message);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
