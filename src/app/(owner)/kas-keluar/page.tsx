import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseManager from '@/components/owner/ExpenseManager';

export default async function KasKeluarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'owner') redirect('/kasir');

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <ExpenseManager
      companyId={profile.company_id}
      userId={profile.id}
      initialExpenses={expenses || []}
    />
  );
}