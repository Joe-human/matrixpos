'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, UserPlus, Receipt, BookOpen, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createCashierAccountAction } from '@/app/(owner)/laporan/actions';
import type { Order, OrderItem, Profile } from '@/types/database';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export default function ReportAndStaffClient({
  initialOrders,
  staffList,
}: {
  initialOrders: OrderWithItems[];
  staffList: Profile[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'transactions' | 'debts' | 'staff'>(
    'transactions'
  );
  const [loading, setLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const debtOrders = orders.filter((o) => o.status === 'debt');

  const handleSettleDebt = async (orderId: string) => {
    if (!confirm('Tandai kasbon ini sudah dibayar lunas (Tunai)?')) return;

    await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: 'cash',
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'paid', payment_method: 'cash' } : o
      )
    );
    router.refresh();
  };

  const handleCreateCashier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStaffError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await createCashierAccountAction(formData);

    if (res?.error) {
      setStaffError(res.error);
      setLoading(false);
      return;
    }

    form.reset();
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Laporan, Kasbon & Akun Kasir
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500">
          Pantau riwayat pembayaran, tagih catatan kasbon, dan kelola akun karyawan kasir
        </p>
      </div>

      {/* Tab Navigasi Responsif */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'transactions'
              ? 'bg-zinc-950 text-white'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-400" />
          <span>Riwayat Lunas ({paidOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'debts'
              ? 'bg-zinc-950 text-white'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Catatan Kasbon ({debtOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'staff'
              ? 'bg-zinc-950 text-white'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Akun Kasir ({staffList.length})</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: RIWAYAT TRANSAKSI LUNAS
      ========================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] uppercase text-zinc-500 bg-zinc-50">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Pelanggan / Meja</th>
                  <th className="py-3.5 px-4">Detail Menu</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs sm:text-sm">
                {paidOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-400">
                      Belum ada riwayat transaksi lunas.
                    </td>
                  </tr>
                ) : (
                  paidOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className="py-3.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {o.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600">
                        {o.order_items
                          ?.map((i) => `${i.quantity}x ${i.menu_name}`)
                          .join(', ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-semibold text-[11px] uppercase">
                          {o.payment_method || 'cash'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        Rp {Number(o.total_amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: DAFTAR KASBON / PIUTANG PELANGGAN
      ========================================================= */}
      {activeTab === 'debts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debtOrders.length === 0 ? (
            <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-10 text-center text-xs text-zinc-400">
              Tidak ada catatan kasbon pelanggan yang belum lunas.
            </div>
          ) : (
            debtOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white border border-amber-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      KASBON
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(o.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-zinc-900 mt-2">
                    {o.customer_name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {o.order_items
                      ?.map((i) => `${i.quantity}x ${i.menu_name}`)
                      .join(', ')}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-base font-extrabold text-zinc-900">
                    Rp {Number(o.total_amount).toLocaleString('id-ID')}
                  </span>
                  <button
                    onClick={() => handleSettleDebt(o.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Lunas
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: KELOLA AKUN STAF KASIR
      ========================================================= */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Tambah Akun Kasir Baru</span>
            </div>

            {staffError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs">
                {staffError}
              </div>
            )}

            <form onSubmit={handleCreateCashier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Kasir *
                </label>
                <input
                  name="fullName"
                  required
                  placeholder="Contoh: Kasir Shift Malam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Login Kasir *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="kasir@warkop.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Membuat Akun...' : 'Buat Akun Kasir'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 font-bold text-xs sm:text-sm text-zinc-800">
              Daftar Pengguna Warkop Ini
            </div>
            <div className="divide-y divide-zinc-100">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-zinc-900">
                      {st.full_name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Bergabung{' '}
                      {new Date(st.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                      st.role === 'owner'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {st.role === 'owner' ? 'Owner' : 'Kasir'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}