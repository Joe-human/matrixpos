'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Store,
  CheckCircle2,
  XCircle,
  LogOut,
  Users,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  createWarkopClientAction,
  toggleCompanyStatusAction,
} from '@/app/admin/actions';

interface CompanyRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  plan_name: string;
  is_active: boolean;
  created_at: string;
  profiles: { id: string; full_name: string; role: string }[];
  orders: { id: string; total_amount: number; status: string }[];
}

export default function AdminClientPanel({
  adminName,
  companies,
}: {
  adminName: string;
  companies: CompanyRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalWarkop = companies.length;
  const activeWarkop = companies.filter((c) => c.is_active).length;
  const totalOmzetGlobal = companies.reduce((acc, c) => {
    const paidOrders = c.orders?.filter((o) => o.status === 'paid') || [];
    return acc + paidOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  }, 0);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    const res = await createWarkopClientAction(formData);

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowModal(false);
    router.refresh();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Header Super Admin */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logomatrixpos.jpeg"
              alt="MatrixPOS"
              className="w-10 h-10 rounded-xl object-cover border border-zinc-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white">
                  MatrixPOS Command Center
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Halo, {adminName} • Matrix Labs SaaS Monitor
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-zinc-800"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Ringkasan Statistik Platform */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Total Klien Warkop</span>
              <Store className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalWarkop} Warkop</p>
            <p className="text-xs text-emerald-400 mt-1">
              {activeWarkop} aktif beroperasi
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Total Pengguna Terdaftar</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {companies.reduce((acc, c) => acc + (c.profiles?.length || 0), 0)}{' '}
              Akun
            </p>
            <p className="text-xs text-zinc-400 mt-1">Owner & Kasir warkop</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Total GMV Transaksi Klien</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              Rp {totalOmzetGlobal.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Akumulasi seluruh warkop
            </p>
          </div>
        </div>

        {/* Action Bar & Daftar Warkop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              Daftar Warkop & Kedai Mitra
            </h2>
            <p className="text-xs text-zinc-400">
              Kelola akun tenant, paket langganan, dan pantau aktivitas transaksi
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Warkop Baru</span>
          </button>
        </div>

        {/* Tabel / Card Responsif Daftar Warkop */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] uppercase text-zinc-400 bg-zinc-950/50">
                  <th className="py-3.5 px-4">Nama Warkop</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Paket</th>
                  <th className="py-3.5 px-4">Transaksi</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {companies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-xs text-zinc-500"
                    >
                      Belum ada warkop terdaftar. Klik &ldquo;Tambah Warkop
                      Baru&rdquo; untuk mendaftarkan klien pertama.
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => {
                    const owner = c.profiles?.find((p) => p.role === 'owner');
                    const paidOrders =
                      c.orders?.filter((o) => o.status === 'paid') || [];
                    const omzet = paidOrders.reduce(
                      (s, o) => s + Number(o.total_amount),
                      0
                    );

                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/40">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="text-xs text-zinc-400">
                            {c.address || 'Alamat belum diisi'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-zinc-200">
                            {owner?.full_name || '-'}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {c.profiles?.length || 0} user terdaftar
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {c.plan_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-white">
                            Rp {omzet.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {paidOrders.length} transaksi lunas
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              toggleCompanyStatusAction(c.id, c.is_active)
                            }
                            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                          >
                            {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Tambah Warkop Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Daftarkan Warkop Klien Baru
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Tutup
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    Nama Warkop *
                  </label>
                  <input
                    name="warkopName"
                    required
                    placeholder="Warkop Bang Jo"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    Paket Langganan
                  </label>
                  <select
                    name="planName"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  >
                    <option value="Trial">Trial / Uji Coba</option>
                    <option value="Basic">Basic UMKM</option>
                    <option value="Pro">Pro Warkop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    Alamat Singkat
                  </label>
                  <input
                    name="address"
                    placeholder="Jl. Cipete Raya, Jaksel"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    No. WhatsApp Owner
                  </label>
                  <input
                    name="phone"
                    placeholder="0812..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
              </div>

              <hr className="border-zinc-800" />

              <div>
                <label className="block text-xs text-zinc-300 mb-1">
                  Nama Lengkap Owner *
                </label>
                <input
                  name="ownerName"
                  required
                  placeholder="Nama pemilik warkop"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    Email Login Owner *
                  </label>
                  <input
                    type="email"
                    name="ownerEmail"
                    required
                    placeholder="owner@warkop.com"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300 mb-1">
                    Password Awal *
                  </label>
                  <input
                    type="text"
                    name="ownerPassword"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-300 mb-1">
                  PIN Otorisasi Owner (4 Digit)
                </label>
                <input
                  type="text"
                  name="pinCode"
                  defaultValue="1234"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Buat Akun Warkop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}