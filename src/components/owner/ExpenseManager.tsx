'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/types/database';

const QUICK_EXPENSES = [
  'Gas Elpiji 3kg',
  'Es Batu Kristal',
  'Air Galon Isi Ulang',
  'Telur Ayam',
  'Indomie Dus',
  'Kopi & Gula',
];

export default function ExpenseManager({
  companyId,
  userId,
  initialExpenses,
}: {
  companyId: string;
  userId: string;
  initialExpenses: Expense[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        company_id: companyId,
        recorded_by: userId,
        description: description.trim(),
        amount: Number(amount),
      })
      .select()
      .single();

    if (!error && data) {
      setExpenses((prev) => [data, ...prev]);
      setDescription('');
      setAmount('');
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus catatan pengeluaran ini?')) return;
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
    router.refresh();
  };

  const totalRecorded = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
          Kas Keluar & Belanja Harian
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500">
          Catat pengeluaran belanja warung (gas, es batu, galon, telur) tanpa ribet stok
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Catat Pengeluaran */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>Catat Pengeluaran Baru</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_EXPENSES.map((qe) => (
              <button
                key={qe}
                type="button"
                onClick={() => setDescription(qe)}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-100 text-[11px] font-medium text-zinc-700"
              >
                + {qe}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Keterangan Belanja *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Beli gas 3kg & es batu"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nominal (Rp) *
              </label>
              <input
                type="number"
                required
                min={500}
                step={500}
                placeholder="25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}</span>
            </button>
          </form>
        </div>

        {/* Daftar Riwayat Kas Keluar */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
            <span className="font-bold text-xs sm:text-sm text-zinc-800">
              Riwayat Pengeluaran Terakhir
            </span>
            <span className="text-xs font-bold text-red-600">
              Total: Rp {totalRecorded.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="divide-y divide-zinc-100">
            {expenses.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-400">
                Belum ada catatan kas keluar.
              </p>
            ) : (
              expenses.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-bold text-sm text-zinc-900">
                      {item.description}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-red-600">
                      - Rp {Number(item.amount).toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}