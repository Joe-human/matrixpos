'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifySuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'superadmin') {
    throw new Error('Akses ditolak: Khusus Super Admin MatrixPOS');
  }
}

export async function createWarkopClientAction(formData: FormData) {
  await verifySuperAdmin();
  const adminSupabase = createAdminClient();

  const warkopName = formData.get('warkopName') as string;
  const address = formData.get('address') as string;
  const phone = formData.get('phone') as string;
  const planName = (formData.get('planName') as string) || 'Trial';
  const ownerName = formData.get('ownerName') as string;
  const ownerEmail = formData.get('ownerEmail') as string;
  const ownerPassword = formData.get('ownerPassword') as string;
  const pinCode = (formData.get('pinCode') as string) || '1234';

  // 1. Buat Company / Warkop baru
  const { data: company, error: companyError } = await adminSupabase
    .from('companies')
    .insert({
      name: warkopName,
      address: address || null,
      phone: phone || null,
      plan_name: planName,
      is_active: true,
    })
    .select()
    .single();

  if (companyError || !company) {
    return { error: companyError?.message || 'Gagal membuat data warkop' };
  }

  // 2. Buat Akun Auth Owner (Email langsung terkonfirmasi)
  const { data: authUser, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    // Rollback company jika gagal bikin user
    await adminSupabase.from('companies').delete().eq('id', company.id);
    return { error: authError?.message || 'Gagal membuat akun email owner' };
  }

  // 3. Buat Profile Owner yang terikat ke company_id baru
  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: authUser.user.id,
    company_id: company.id,
    full_name: ownerName,
    role: 'owner',
    pin_code: pinCode,
    is_active: true,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function toggleCompanyStatusAction(
  companyId: string,
  currentStatus: boolean
) {
  await verifySuperAdmin();
  const adminSupabase = createAdminClient();

  await adminSupabase
    .from('companies')
    .update({ is_active: !currentStatus })
    .eq('id', companyId);

  revalidatePath('/admin');
}