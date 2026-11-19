'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';

const CATEGORIES = ['Semua', 'Kopi', 'Non-Kopi', 'Makanan', 'Cemilan', 'Rokok & Lainnya'];

export default function MenuManager({
  companyId,
  initialMenus,
}: {
  companyId: string;
  initialMenus: MenuItem[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [menus, setMenus] = useState<MenuItem[]>(initialMenus);
  const [selectedCat, setSelectedCat] = useState('Semua');
  const [search, setSearch] = useState('');

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Kopi');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredMenus = menus.filter((m) => {
    const matchCat = selectedCat === 'Semua' || m.category === selectedCat;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('Kopi');
    setPrice('');
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(String(item.price));
    setShowModal(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const numericPrice = Number(price) || 0;

    if (editingItem) {
      const { data, error } = await supabase
        .from('menus')
        .update({ name, category, price: numericPrice })
        .eq('id', editingItem.id)
        .select()
        .single();

      if (!error && data) {
        setMenus((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      }
    } else {
      const { data, error } = await supabase
        .from('menus')
        .insert({
          company_id: companyId,
          name,
          category,
          price: numericPrice,
          is_available: true,
        })
        .select()
        .single();

      if (!error && data) {
        setMenus((prev) => [...prev, data]);
      }
    }

    setLoading(false);
    setShowModal(false);
    router.refresh();
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const nextStatus = !item.is_available;
    setMenus((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_available: nextStatus } : m))
    );

    await supabase
      .from('menus')
      .update({ is_available: nextStatus })
      .eq('id', item.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus menu ini secara permanen?')) return;
    setMenus((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('menus').delete().eq('id', id);
    router.refresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Daftar Menu Warkop
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Atur harga dan status ketersediaan menu (Tersedia / Habis) secara real-time
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Tambah Menu</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        {/* Kategori Horizontal Scroll di HP */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCat === cat
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kopi, indomie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Grid Menu Responsif: 1 kolom HP, 2 kolom Tablet, 3 kolom Laptop */}
      {filteredMenus.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-700">Belum ada menu di kategori ini</p>
          <p className="text-xs text-zinc-500">
            Klik tombol &ldquo;Tambah Menu&rdquo; di atas untuk mulai mengisi daftar menu warkop.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenus.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                item.is_available
                  ? 'border-zinc-200'
                  : 'border-red-200 bg-red-50/30 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 mb-1.5">
                    {item.category}
                  </span>
                  <h3 className="font-bold text-zinc-900 text-base leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-sm font-semibold text-amber-600 mt-1">
                    Rp {Number(item.price).toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Tombol Edit & Hapus */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    title="Edit Menu"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    title="Hapus Menu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Footer Card: Toggle Tersedia / Habis */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Status Stok:</span>
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    item.is_available
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                  }`}
                >
                  {item.is_available ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Tersedia
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" /> Habis
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Menu */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">
                {editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Susu Gula Aren / Indomie Telor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-sm bg-white focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    placeholder="10000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}