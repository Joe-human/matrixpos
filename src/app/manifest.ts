import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatrixPOS — Kasir Warkop & Kedai',
    short_name: 'MatrixPOS',
    description: 'Sistem Kasir POS & Manajemen Warkop oleh Matrix Labs',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/logomatrixpos.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}