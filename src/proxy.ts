import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login');

  // Belum login -> lempar ke /login
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Sudah login -> cek role dan arahkan jika mengakses halaman auth atau halaman terlarang
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (isAuthPage || path === '/') {
      const url = request.nextUrl.clone();
      if (role === 'superadmin') url.pathname = '/admin';
      else if (role === 'owner') url.pathname = '/dashboard';
      else url.pathname = '/kasir';
      return NextResponse.redirect(url);
    }

    // Selain superadmin dilarang masuk ke /admin
    if (path.startsWith('/admin') && role !== 'superadmin') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'owner' ? '/dashboard' : '/kasir';
      return NextResponse.redirect(url);
    }

    // Kasir dilarang masuk ke halaman khusus owner
    const ownerOnlyPaths = ['/dashboard', '/menu', '/laporan', '/kas-keluar'];
    if (role === 'cashier' && ownerOnlyPaths.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = '/kasir';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};