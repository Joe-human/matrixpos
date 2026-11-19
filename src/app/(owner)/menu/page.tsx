import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MenuManager from '@/components/owner/MenuManager';

export default async function MenuPage() {
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

  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return (
    <MenuManager
      companyId={profile.company_id}
      initialMenus={menus || []}
    />
  );
}