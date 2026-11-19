import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminClientPanel from '@/components/admin/AdminClientPanel';

export default async function SuperAdminPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'superadmin') {
    redirect('/dashboard');
  }

  const adminSupabase = createAdminClient();

  // Ambil semua warkop beserta owner dan ringkasan order
  const { data: companies } = await adminSupabase
    .from('companies')
    .select(`
      *,
      profiles (id, full_name, role),
      orders (id, total_amount, status)
    `)
    .neq('name', 'Matrix Labs HQ')
    .order('created_at', { ascending: false });

  return (
    <AdminClientPanel
      adminName={profile.full_name}
      companies={companies || []}
    />
  );
}