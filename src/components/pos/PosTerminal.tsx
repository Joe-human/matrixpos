'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  Printer,
  Lock,
  Unlock,
  X,
  MessageSquarePlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MenuItem, Shift, Order, OrderItem, PaymentMethod } from '@/types/database';

interface CartItem {
  menu: MenuItem;
  quantity: number;
  notes: string;
}

interface OpenOrderWithItems extends Order {
  order_items: OrderItem[];
}

const QUICK_NOTES = [
  'Es Sedikit',
  'Manis',
  'Sedang',
  'Pedas',
  'Setengah Matang',
  'Kuah Pisah',
];

export default function PosTerminal({
  companyId,
  cashierId,
  cashierName,
  warkopName,
  warkopAddress,
  receiptFooter,
  initialMenus,
  initialShift,
  initialOpenOrders,
}: {
  companyId: string;
  cashierId: string;
  cashierName: string;
  warkopName: string;
  warkopAddress: string;
  receiptFooter: string;
  initialMenus: MenuItem[];
  initialShift: Shift | null;
  initialOpenOrders: OpenOrderWithItems[];
}) {
  const router = useRouter();
  const supabase = createClient();

  // State Shift
  const [activeShift, setActiveShift] = useState<Shift | null>(initialShift);
  const [startingCash, setStartingCash] = useState('100000');
  const [actualCash, setActualCash] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // State Menu & Filter
  const [menus] = useState<MenuItem[]>(initialMenus);
  const [selectedCat, setSelectedCat] = useState('Semua');
  const [search, setSearch] = useState('');

  // State Cart & Active Open Bill
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrderWithItems[]>(initialOpenOrders);

  // Mobile Drawer State
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showOpenBillsModal, setShowOpenBillsModal] = useState(false);

  // Checkout & Struk State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    customerName: string;
    items: CartItem[];
    total: number;
    method: string;
    cashReceived: number;
    change: number;
    date: string;
  } | null>(null);

  // Catatan Cepat Modal
  const [noteTargetIndex, setNoteTargetIndex] = useState<number | null>(null);

  const categories = ['Semua', ...Array.from(new Set(menus.map((m) => m.category)))];

  const filteredMenus = menus.filter((m) => {
    const matchCat = selectedCat === 'Semua' || m.category === selectedCat;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.menu.price) * item.quantity,
    0
  );
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- FUNGSI SHIFT ---
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        company_id: companyId,
        cashier_id: cashierId,
        starting_cash: Number(startingCash) || 0,
        status: 'open',
      })
      .select()
      .single();

    if (!error && data) {
      setActiveShift(data);
    }
    setProcessing(false);
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setProcessing(true);

    // Hitung total penjualan cash selama shift ini
    const { data: shiftCashOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('shift_id', activeShift.id)
      .eq('status', 'paid')
      .eq('payment_method', 'cash');

    const totalCashSales = (shiftCashOrders || []).reduce(
      (s, o) => s + Number(o.total_amount),
      0
    );
    const expected = Number(activeShift.starting_cash) + totalCashSales;

    await supabase
      .from('shifts')
      .update({
        expected_cash: expected,
        actual_cash: Number(actualCash) || 0,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', activeShift.id);

    setActiveShift(null);
    setShowCloseShiftModal(false);
    setProcessing(false);
    router.refresh();
  };

  // --- FUNGSI KERANJANG ---
  const addToCart = (menu: MenuItem) => {
    if (!menu.is_available) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menu.id === menu.id && !i.notes);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { menu, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = nextQty;
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setActiveOrderId(null);
    setMobileCartOpen(false);
  };

  // --- SIMPAN OPEN BILL (TAB MEJA NONGKRONG) ---
  const handleSaveOpenBill = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    const labelName = customerName.trim() || `Meja / Tamu #${openOrders.length + 1}`;

    if (activeOrderId) {
      // Update Open Bill yang sudah ada
      await supabase
        .from('orders')
        .update({ customer_name: labelName, total_amount: totalAmount })
        .eq('id', activeOrderId);

      await supabase.from('order_items').delete().eq('order_id', activeOrderId);

      const itemsPayload = cart.map((c) => ({
        company_id: companyId,
        order_id: activeOrderId,
        menu_id: c.menu.id,
        menu_name: c.menu.name,
        price: c.menu.price,
        quantity: c.quantity,
        notes: c.notes || null,
        subtotal: Number(c.menu.price) * c.quantity,
      }));
      await supabase.from('order_items').insert(itemsPayload);
    } else {
      // Buat Open Bill baru
      const { data: newOrder } = await supabase
        .from('orders')
        .insert({
          company_id: companyId,
          shift_id: activeShift?.id || null,
          cashier_id: cashierId,
          customer_name: labelName,
          status: 'open',
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (newOrder) {
        const itemsPayload = cart.map((c) => ({
          company_id: companyId,
          order_id: newOrder.id,
          menu_id: c.menu.id,
          menu_name: c.menu.name,
          price: c.menu.price,
          quantity: c.quantity,
          notes: c.notes || null,
          subtotal: Number(c.menu.price) * c.quantity,
        }));
        await supabase.from('order_items').insert(itemsPayload);
      }
    }

    // Refresh daftar open bill
    const { data: refreshedOpens } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    setOpenOrders(refreshedOpens || []);
    clearCart();
    setProcessing(false);
  };

  // --- MUAT OPEN BILL KE KERANJANG ---
  const loadOpenOrder = (order: OpenOrderWithItems) => {
    const mappedCart: CartItem[] = order.order_items.map((oi) => {
      const foundMenu = menus.find((m) => m.id === oi.menu_id) || {
        id: oi.menu_id || oi.id,
        company_id: companyId,
        name: oi.menu_name,
        category: 'Lainnya',
        price: oi.price,
        is_available: true,
        created_at: '',
      };
      return {
        menu: foundMenu,
        quantity: oi.quantity,
        notes: oi.notes || '',
      };
    });

    setCart(mappedCart);
    setCustomerName(order.customer_name);
    setActiveOrderId(order.id);
    setShowOpenBillsModal(false);
    setMobileCartOpen(true);
  };

  // --- PROSES PEMBAYARAN / CHECKOUT ---
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setProcessing(true);

    const paidCash = paymentMethod === 'cash' ? Number(cashReceived) || totalAmount : totalAmount;
    const change = paymentMethod === 'cash' ? Math.max(0, paidCash - totalAmount) : 0;
    const finalStatus = paymentMethod === 'debt' ? 'debt' : 'paid';
    const labelName = customerName.trim() || 'Pelanggan Umum';

    if (activeOrderId) {
      await supabase
        .from('orders')
        .update({
          customer_name: labelName,
          status: finalStatus,
          payment_method: paymentMethod,
          total_amount: totalAmount,
          cash_received: paidCash,
          change_amount: change,
          paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', activeOrderId);

      await supabase.from('order_items').delete().eq('order_id', activeOrderId);
      await supabase.from('order_items').insert(
        cart.map((c) => ({
          company_id: companyId,
          order_id: activeOrderId,
          menu_id: c.menu.id,
          menu_name: c.menu.name,
          price: c.menu.price,
          quantity: c.quantity,
          notes: c.notes || null,
          subtotal: Number(c.menu.price) * c.quantity,
        }))
      );

      setOpenOrders((prev) => prev.filter((o) => o.id !== activeOrderId));
    } else {
      const { data: newOrder } = await supabase
        .from('orders')
        .insert({
          company_id: companyId,
          shift_id: activeShift?.id || null,
          cashier_id: cashierId,
          customer_name: labelName,
          status: finalStatus,
          payment_method: paymentMethod,
          total_amount: totalAmount,
          cash_received: paidCash,
          change_amount: change,
          paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (newOrder) {
        await supabase.from('order_items').insert(
          cart.map((c) => ({
            company_id: companyId,
            order_id: newOrder.id,
            menu_id: c.menu.id,
            menu_name: c.menu.name,
            price: c.menu.price,
            quantity: c.quantity,
            notes: c.notes || null,
            subtotal: Number(c.menu.price) * c.quantity,
          }))
        );
      }
    }

    setLastReceipt({
      customerName: labelName,
      items: [...cart],
      total: totalAmount,
      method: paymentMethod.toUpperCase(),
      cashReceived: paidCash,
      change,
      date: new Date().toLocaleString('id-ID'),
    });

    setShowCheckoutModal(false);
    setCashReceived('');
    clearCart();
    setProcessing(false);
  };

  // --- JIKA SHIFT BELUM DIBUKA ---
  if (!activeShift) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Unlock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Buka Kasir (Mulai Shift)</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Masukkan jumlah uang tunai modal awal di dalam laci sebelum mulai mencatat pesanan.
          </p>
        </div>

        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Modal Awal Laci Kasir (Rp)
            </label>
            <input
              type="number"
              required
              min={0}
              step={1000}
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-base font-bold text-zinc-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors"
          >
            {processing ? 'Membuka Shift...' : 'Buka Laci & Mulai Jualan'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-4rem)]">
      {/* =========================================================
          KOLOM KIRI: KATALOG MENU & TOMBOL OPEN BILL
      ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Action Bar Kasir */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOpenBillsModal(true)}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Open Bill Meja</span>
              {openOrders.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-zinc-950 font-bold">
                  {openOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCloseShiftModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-50"
            >
              <Lock className="w-3.5 h-3.5 text-red-500" />
              <span>Tutup Shift</span>
            </button>
          </div>

          {/* Search Menu */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Filter Kategori Horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === cat
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Card Menu (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-4 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMenus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => addToCart(menu)}
                disabled={!menu.is_available}
                className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-24 ${
                  menu.is_available
                    ? 'bg-white border-zinc-200 hover:border-amber-500 active:scale-[0.98]'
                    : 'bg-zinc-100 border-zinc-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase">
                    {menu.category}
                  </span>
                  <h3 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2 mt-0.5">
                    {menu.name}
                  </h3>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600">
                    Rp {Number(menu.price).toLocaleString('id-ID')}
                  </span>
                  {!menu.is_available && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                      HABIS
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          FLOATING BAR KHUSUS HP/TABLET KECIL (DI BAWAH LAYAR)
      ========================================================= */}
      {totalQty > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-zinc-950 text-white shadow-xl border border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm flex items-center justify-center">
                {totalQty}
              </div>
              <div className="text-left">
                <p className="text-xs text-zinc-400">
                  {customerName || 'Pesanan Baru'}
                </p>
                <p className="text-sm font-bold">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400">
              Lihat Keranjang &rarr;
            </span>
          </button>
        </div>
      )}

      {/* =========================================================
          KOLOM KANAN: KERANJANG & CHECKOUT (SLIDE-UP DI HP, FIXED DI LAPTOP)
      ========================================================= */}
      <div
        className={`fixed inset-0 z-40 lg:static lg:z-auto lg:w-96 shrink-0 flex flex-col bg-white lg:border lg:border-zinc-200 lg:rounded-2xl overflow-hidden transition-transform duration-200 ${
          mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        {/* Header Keranjang */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-sm text-zinc-900">
              {activeOrderId ? 'Edit Open Bill' : 'Pesanan Baru'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:underline font-medium"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden p-1.5 rounded-lg bg-zinc-200 text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Nama Meja / Pelanggan Nongkrong */}
        <div className="p-3 border-b border-zinc-100">
          <input
            type="text"
            placeholder="Nama Pelanggan / Meja (Contoh: Meja 2 - Bang Jo)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* List Item Keranjang */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <ShoppingBag className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">Belum ada menu dipilih</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.menu.id}-${idx}`}
                className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{item.menu.name}</p>
                    <p className="text-xs text-zinc-500">
                      Rp {(Number(item.menu.price) * item.quantity).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Kontrol Qty */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(idx, -1)}
                      className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="w-6 text-center text-xs font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(idx, 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Catatan / Modifier Item */}
                <div className="flex items-center justify-between">
                  {item.notes ? (
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Catatan: {item.notes}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400">Tanpa catatan</span>
                  )}
                  <button
                    onClick={() => setNoteTargetIndex(idx)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-amber-600 font-medium"
                  >
                    <MessageSquarePlus className="w-3 h-3" /> Catatan
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Total & Tombol Simpan Open Bill / Bayar */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Tagihan</span>
            <span className="text-lg font-extrabold text-zinc-900">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0 || processing}
              onClick={handleSaveOpenBill}
              className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs disabled:opacity-40"
            >
              Simpan Open Bill
            </button>
            <button
              type="button"
              disabled={cart.length === 0 || processing}
              onClick={() => {
                setCashReceived(String(totalAmount));
                setShowCheckoutModal(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-40"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL 1: CATATAN CEPAT ITEM WARKOP
      ========================================================= */}
      {noteTargetIndex !== null && cart[noteTargetIndex] && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-zinc-900">
              Catatan untuk {cart[noteTargetIndex].menu.name}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => {
                    const updated = [...cart];
                    updated[noteTargetIndex].notes = qn;
                    setCart(updated);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-100 text-xs font-medium text-zinc-700"
                >
                  {qn}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Atau ketik catatan manual..."
              value={cart[noteTargetIndex].notes}
              onChange={(e) => {
                const updated = [...cart];
                updated[noteTargetIndex].notes = e.target.value;
                setCart(updated);
              }}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
            />
            <button
              onClick={() => setNoteTargetIndex(null)}
              className="w-full py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: DAFTAR OPEN BILL MEJA
      ========================================================= */}
      {showOpenBillsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">
                Daftar Open Bill ({openOrders.length})
              </h3>
              <button
                onClick={() => setShowOpenBillsModal(false)}
                className="text-xs text-zinc-500"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {openOrders.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-8">
                  Tidak ada tagihan meja yang menggantung.
                </p>
              ) : (
                openOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => loadOpenOrder(order)}
                    className="w-full text-left p-3.5 rounded-xl border border-zinc-200 hover:border-amber-500 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-zinc-900">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {order.order_items?.length || 0} item pesanan
                      </p>
                    </div>
                    <span className="font-bold text-sm text-amber-600">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: PEMBAYARAN / CHECKOUT
      ========================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">Pembayaran</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-xs text-zinc-500"
              >
                Batal
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 text-white flex items-center justify-between">
              <span className="text-xs text-zinc-400">Total Bayar</span>
              <span className="text-xl font-extrabold text-amber-400">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'cash', label: 'Tunai' },
                      { id: 'qris', label: 'QRIS' },
                      { id: 'transfer', label: 'Transfer' },
                      { id: 'debt', label: 'Kasbon' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                        paymentMethod === m.id
                          ? 'bg-amber-500 border-amber-500 text-zinc-950'
                          : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={totalAmount}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-bold"
                  />
                  <p className="text-xs text-emerald-600 font-semibold mt-1.5">
                    Kembalian: Rp{' '}
                    {Math.max(
                      0,
                      (Number(cashReceived) || 0) - totalAmount
                    ).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {paymentMethod === 'debt' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Pastikan nama pelanggan sudah diisi di kolom nama meja agar tercatat di daftar piutang/kasbon.
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm"
              >
                {processing ? 'Memproses...' : 'Selesaikan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: STRUK TRANSAKSI SELESAI & CETAK
      ========================================================= */}
      {lastReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-1" />
              <h3 className="font-bold text-base text-zinc-900">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-zinc-500">{lastReceipt.date}</p>
            </div>

            <div className="border-y border-dashed border-zinc-300 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-zinc-900">
                <span>{warkopName}</span>
                <span>{lastReceipt.method}</span>
              </div>
              {warkopAddress && (
                <p className="text-[11px] text-zinc-500">{warkopAddress}</p>
              )}
              <p className="text-[11px] text-zinc-500">
                Pelanggan: {lastReceipt.customerName} • Kasir: {cashierName}
              </p>

              <div className="pt-2 space-y-1">
                {lastReceipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.menu.name}
                    </span>
                    <span>
                      Rp {(Number(it.menu.price) * it.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-200 pt-2 mt-2 space-y-1 font-bold">
                <div className="flex justify-between text-sm">
                  <span>TOTAL</span>
                  <span>Rp {lastReceipt.total.toLocaleString('id-ID')}</span>
                </div>
                {lastReceipt.method === 'CASH' && (
                  <>
                    <div className="flex justify-between font-normal text-zinc-600">
                      <span>Tunai</span>
                      <span>Rp {lastReceipt.cashReceived.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-normal text-zinc-600">
                      <span>Kembali</span>
                      <span>Rp {lastReceipt.change.toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-center text-[11px] text-zinc-500 pt-2">
                {receiptFooter}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                onClick={() => setLastReceipt(null)}
                className="py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 5: TUTUP SHIFT KASIR
      ========================================================= */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-900">Tutup Shift Kasir</h3>
            <p className="text-xs text-zinc-500">
              Hitung total uang tunai fisik yang ada di laci kasir saat ini (termasuk modal awal Rp{' '}
              {Number(activeShift.starting_cash).toLocaleString('id-ID')}).
            </p>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Total Uang Fisik di Laci (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-base font-bold"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Tutup Shift Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}