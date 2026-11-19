'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createCashierAccountAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!ownerProfile || ownerProfile.role !== 'owner') {
    return { error: 'Hanya Owner yang dapat menambah akun kasir' };
  }

  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const adminSupabase = createAdminClient();

  const { data: newUser, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !newUser.user) {
    return { error: authError?.message || 'Gagal membuat akun kasir' };
  }

  const { error: profError } = await adminSupabase.from('profiles').insert({
    id: newUser.user.id,
    company_id: ownerProfile.company_id,
    full_name: fullName,
    role: 'cashier',
    is_active: true,
  });

  if (profError) {
    return { error: profError.message };
  }

  revalidatePath('/laporan');
  return { success: true };
}