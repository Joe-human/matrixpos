'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Email atau password salah.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role === 'superadmin') {
      router.push('/admin');
    } else if (profile?.role === 'owner') {
      router.push('/dashboard');
    } else {
      router.push('/kasir');
    }

    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img
            src="/logomatrixpos.jpeg"
            alt="MatrixPOS"
            className="w-16 h-16 rounded-2xl object-cover border border-zinc-700"
          />
          <h1 className="text-xl font-bold text-white">MatrixPOS</h1>
          <p className="text-xs text-zinc-400">
            Sistem Kasir Simpel Buat Warkop & Kedai — by Matrix Labs
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Akun
            </label>
            <input
              type="email"
              required
              placeholder="nama@warkop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk ke Kasir'}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-500">
          Ingin mendaftarkan warkop Anda? Hubungi Admin{' '}
          <span className="text-zinc-300 font-medium">Matrix Labs</span>
        </p>
      </div>
    </div>
  );
}