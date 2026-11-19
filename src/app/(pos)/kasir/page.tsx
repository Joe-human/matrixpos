import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PosTerminal from '@/components/pos/PosTerminal';

export default async function KasirPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, full_name, role, companies(name, address, receipt_footer)')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  // Ambil daftar menu warkop
  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  // Cek apakah ada shift yang sedang terbuka (open)
  const { data: activeShift } = await supabase
    .from('shifts')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Ambil daftar Open Bill (pesanan belum dibayar / meja nongkrong)
  const { data: openOrders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('company_id', profile.company_id)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const companyInfo = profile.companies as unknown as {
    name: string;
    address: string | null;
    receipt_footer: string | null;
  };

  return (
    <PosTerminal
      companyId={profile.company_id}
      cashierId={profile.id}
      cashierName={profile.full_name}
      warkopName={companyInfo?.name || 'Warkop'}
      warkopAddress={companyInfo?.address || ''}
      receiptFooter={companyInfo?.receipt_footer || 'Terima kasih sudah mampir!'}
      initialMenus={menus || []}
      initialShift={activeShift}
      initialOpenOrders={openOrders || []}
    />
  );
}