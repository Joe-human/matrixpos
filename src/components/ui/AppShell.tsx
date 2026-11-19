import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from './Sidebar';
import type { UserRole } from '@/types/database';

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, companies(name, is_active)')
    .eq('id', user.id)
    .single();

  const company = profile?.companies as unknown as {
    name: string;
    is_active: boolean;
  } | null;

  // Jika akun warkop dinonaktifkan oleh Super Admin Matrix Labs
  if (profile?.role !== 'superadmin' && company && !company.is_active) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <img
            src="/logomatrixpos.jpeg"
            alt="MatrixPOS"
            className="w-14 h-14 rounded-2xl mx-auto object-cover border border-zinc-700"
          />
          <h1 className="text-lg font-bold text-white">
            Akses Layanan Ditangguhkan
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Langganan MatrixPOS untuk <strong>{company.name}</strong> sedang
            nonaktif. Silakan hubungi admin <strong>Matrix Labs</strong> untuk
            aktivasi kembali.
          </p>
        </div>
      </div>
    );
  }

  const warkopName = company?.name || 'Warkop MatrixPOS';

  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900 flex flex-col lg:flex-row">
      <Sidebar
        role={(profile?.role as UserRole) || 'cashier'}
        userName={profile?.full_name || 'Pengguna'}
        warkopName={warkopName}
      />
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}