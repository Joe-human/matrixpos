import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportAndStaffClient from '@/components/owner/ReportAndStaffClient';

export default async function LaporanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'owner') redirect('/kasir');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('company_id', profile.company_id)
    .neq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: true });

  return (
    <ReportAndStaffClient
      initialOrders={orders || []}
      staffList={staff || []}
    />
  );
}