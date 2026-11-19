import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function OwnerDashboardPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, full_name, companies(name)')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'owner') redirect('/kasir');

  const companyId = profile.company_id;
  const warkopName =
    (profile.companies as unknown as { name: string } | null)?.name || 'Warkop';

  // Awal hari ini (WIB / lokal server)
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  // 7 hari terakhir
  const sevenDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6
  ).toISOString();

  // Ambil orders 7 hari terakhir
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, total_amount, status, payment_method, created_at, customer_name')
    .eq('company_id', companyId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });

  // Ambil pengeluaran hari ini
  const { data: todayExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('company_id', companyId)
    .gte('created_at', startOfToday);

  // Ambil item terlaris 7 hari terakhir
  const { data: recentItems } = await supabase
    .from('order_items')
    .select('menu_name, quantity, subtotal, orders!inner(status, created_at)')
    .eq('company_id', companyId)
    .eq('orders.status', 'paid')
    .gte('orders.created_at', sevenDaysAgo);

  const ordersList = recentOrders || [];
  const todayPaidOrders = ordersList.filter(
    (o) => o.status === 'paid' && o.created_at >= startOfToday
  );
  const openBills = ordersList.filter((o) => o.status === 'open');
  const debtOrders = ordersList.filter((o) => o.status === 'debt');

  const omzetHariIni = todayPaidOrders.reduce(
    (s, o) => s + Number(o.total_amount),
    0
  );
  const pengeluaranHariIni = (todayExpenses || []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );
  const labaBersihHariIni = omzetHariIni - pengeluaranHariIni;

  // Hitung Grafik 7 Hari Terakhir
  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const total = ordersList
      .filter((o) => o.status === 'paid' && o.created_at.slice(0, 10) === dateStr)
      .reduce((s, o) => s + Number(o.total_amount), 0);
    return { dateStr, label, total };
  });

  const maxDaily = Math.max(...dailyStats.map((d) => d.total), 1);

  // Hitung Top 5 Menu Terlaris
  const menuMap = new Map<string, { qty: number; revenue: number }>();
  (recentItems || []).forEach((it) => {
    const cur = menuMap.get(it.menu_name) || { qty: 0, revenue: 0 };
    menuMap.set(it.menu_name, {
      qty: cur.qty + it.quantity,
      revenue: cur.revenue + Number(it.subtotal),
    });
  });

  const topMenus = Array.from(menuMap.entries())
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Dashboard {warkopName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Ringkasan performa penjualan dan arus kas harian warkop
          </p>
        </div>

        <Link
          href="/kasir"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-colors"
        >
          <span>Buka Layar Kasir</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 4 Kartu Metrik Utama: 1 kolom HP, 2 kolom Tablet, 4 kolom Laptop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Omzet Hari Ini</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-zinc-900">
            Rp {omzetHariIni.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-zinc-400">
            Dari {todayPaidOrders.length} transaksi lunas
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Belanja / Kas Keluar</span>
            <Wallet className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-zinc-900">
            Rp {pengeluaranHariIni.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-zinc-400">Pengeluaran operasional hari ini</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Estimasi Laba Bersih</span>
            <PiggyBank className="w-4 h-4 text-amber-600" />
          </div>
          <p
            className={`text-2xl font-extrabold ${
              labaBersihHariIni >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            Rp {labaBersihHariIni.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-zinc-400">Omzet dikurangi kas keluar</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Open Bill & Kasbon</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-zinc-900">
            {openBills.length} Meja • {debtOrders.length} Bon
          </p>
          <p className="text-xs text-zinc-400">Tagihan berjalan & piutang</p>
        </div>
      </div>

      {/* Grafik Omzet 7 Hari + Top Menu Terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Grafik Batang CSS Murni Responsif */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="font-bold text-base text-zinc-900">
              Tren Omzet 7 Hari Terakhir
            </h2>
            <p className="text-xs text-zinc-500">
              Perbandingan pendapatan harian warkop
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 pt-6 border-b border-zinc-100 pb-2">
            {dailyStats.map((day) => {
              const heightPct = Math.max(8, Math.round((day.total / maxDaily) * 100));
              return (
                <div
                  key={day.dateStr}
                  className="flex flex-col items-center justify-end h-full gap-2 group"
                >
                  <span className="text-[10px] font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                    {day.total > 0 ? `${Math.round(day.total / 1000)}k` : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-10 rounded-t-xl bg-amber-500 group-hover:bg-amber-400 transition-all"
                    title={`${day.label}: Rp ${day.total.toLocaleString('id-ID')}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2 text-center">
            {dailyStats.map((day) => (
              <span
                key={day.dateStr}
                className="text-[10px] sm:text-xs font-medium text-zinc-500 truncate"
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>

        {/* Menu Terlaris */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-zinc-900">Menu Terlaris</h2>
              <p className="text-xs text-zinc-500">7 hari terakhir</p>
            </div>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>

          {topMenus.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Belum ada data penjualan minggu ini.
            </p>
          ) : (
            <div className="space-y-3">
              {topMenus.map((m, idx) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 last:border-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-zinc-900 truncate">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Rp {m.revenue.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 shrink-0">
                    {m.qty}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}