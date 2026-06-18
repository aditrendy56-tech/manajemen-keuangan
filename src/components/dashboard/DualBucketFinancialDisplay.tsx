'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, ArrowRight, Info, X } from 'lucide-react';
import Link from 'next/link';

interface FinancialBalance {
  kas_utama: number;
  profit_pending: number;
  simpan_uang: number;
  total_available: number;
  last_updated: string;
}

interface DualBucketProps {
  outletId: string;
}

interface DescriptionModalProps {
  selectedDescription: string | null;
  onClose: () => void;
}

function DescriptionModal({ selectedDescription, onClose }: DescriptionModalProps) {
  const descriptions: Record<string, { title: string; content: JSX.Element }> = {
    kas_utama: {
      title: 'Kas Utama (60% Sales)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">📐 Cara Perhitungan:</h4>
            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border border-green-200">
              Kas Utama = Modal Injeksi AWAL + (60% × Setiap Sale Bersih)
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-green-700 mb-2">✅ BOLEH Digunakan Untuk:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Beli bahan/ingredients untuk produksi</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Bayar gaji karyawan</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Bayar sewa tempat usaha</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Bayar utilitas (listrik, air, gas)</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Bayar internet/telepon</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Servis & maintenance peralatan</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Keperluan operasional lainnya</span>
              </li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tips:</strong> Pastikan selalu ada buffer minimal Rp 100K untuk kebutuhan mendesak!
            </p>
          </div>
        </div>
      ),
    },
    profit_pending: {
      title: 'Profit Pending (40% Sales)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">📐 Cara Perhitungan:</h4>
            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
              Profit Pending = 40% × Setiap Sale Bersih (Gross - HPP - Fee)
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">🔒 Status & Penggunaan:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>⏳</span>
                <span>Dikunci hingga akhir bulan (jangan diambil untuk operasional)</span>
              </li>
              <li className="flex gap-2">
                <span>📊</span>
                <span>Terkumpul sepanjang bulan dari setiap penjualan</span>
              </li>
              <li className="flex gap-2">
                <span>⚖️</span>
                <span>Dialokasikan akhir bulan di menu &quot;Alokasi Profit&quot;</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">📋 Dialokasikan Untuk:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>1.</span>
                <span><strong>Bayar Hutang Investor</strong> (PRIORITAS - cicil investasi)</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span><strong>Kas Utama Top-up</strong> (untuk month depan)</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span><strong>Simpan Uang</strong> (strategic fund)</span>
              </li>
              <li className="flex gap-2">
                <span>4.</span>
                <span><strong>Profit Distribution</strong> (ke investors)</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    simpan_uang: {
      title: 'Simpan Uang (Strategic Fund)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-orange-700 mb-2">📐 Asal Dananya:</h4>
            <p className="text-sm text-gray-700 bg-orange-50 p-3 rounded border border-orange-200">
              Dialokasikan dari Profit Pending akhir bulan (bukan dari modal/sales langsung)
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-orange-700 mb-2">💼 Tujuan Penggunaan:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>🚨</span>
                <span>Dana Darurat (emergency fund) - collapse bisnis</span>
              </li>
              <li className="flex gap-2">
                <span>🛠️</span>
                <span>Pembelian Alat/Equipment baru</span>
              </li>
              <li className="flex gap-2">
                <span>📈</span>
                <span>Modal Ekspansi (outlet baru/produk baru)</span>
              </li>
              <li className="flex gap-2">
                <span>🎯</span>
                <span>Investasi strategis lainnya</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-orange-700 mb-2">📝 Pencatatan:</h4>
            <p className="text-sm text-gray-700">
              Setiap alokasi dicatat dengan <strong>reason/alasan</strong> dan <strong>status tracking</strong>
              (active/reallocated/used/archived) untuk audit trail yang jelas.
            </p>
          </div>
        </div>
      ),
    },
    total_tersedia: {
      title: 'Total Tersedia (Bayar Hutang Dulu)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-purple-700 mb-2">📐 Rumus:</h4>
            <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded border border-purple-200">
              Total Tersedia = Kas Utama + Profit Pending + Simpan Uang
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-purple-700 mb-2">⚖️ Prinsip “Bayar Hutang Dulu”:</h4>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="font-semibold mb-2">Prioritas Pembayaran (Akhir Bulan):</p>
                <ol className="space-y-2 ml-4">
                  <li><strong>1. Hutang CICIL Investor</strong> - Bayar dari Profit Pending (FIRST)</li>
                  <li><strong>2. Hutang BELUM Bayar</strong> - Jika ada sisa Profit Pending</li>
                  <li><strong>3. Profit Distribution</strong> - Investor yang LUNAS dapat profit share</li>
                  <li><strong>4. Strategic Allocation</strong> - Simpan Uang & Kas Top-up</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              <strong>🎯 Goal:</strong> Menghindari situation &quot;Profit Rp 9M tapi kas cuma Rp 6.5M&quot;. 
              Dengan sistem ini, setiap rupiah tracking clear dan tidak tercampur!
            </p>
          </div>
        </div>
      ),
    },
  };

  const desc = descriptions[selectedDescription ?? ''];
  if (!desc) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sticky top-0 bg-white border-b">
          <CardTitle>{desc.title}</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-6">{desc.content}</CardContent>
      </Card>
    </div>
  );
}

export function DualBucketFinancialDisplay({ outletId }: DualBucketProps) {
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId) {
      setBalance(null);
      setError('Outlet belum tersedia');
      setLoading(false);
      return;
    }

    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(outletId);
    if (!isValidUuid) {
      setBalance(null);
      setError('Outlet ID tidak valid');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const runFetch = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cash/financial-summary?outlet_id=${outletId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch balance');
        }
        const data = await response.json();
        if (!cancelled) {
          setBalance(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch financial balance:', err);
          setError(err instanceof Error ? err.message : 'Gagal mengambil data saldo');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void runFetch();

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      void runFetch();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [outletId, refreshTrigger]);

  if (loading && !balance) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setRefreshTrigger((t) => t + 1)}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Coba Lagi
          </button>
        </CardContent>
      </Card>
    );
  }

  // Determine status badges based on balances

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">💰 Sistem Dual-Bucket Anda</h2>
          <p className="text-sm text-gray-600">
            Bayar hutang dulu, baru bagikan profit
          </p>
        </div>
        <Link
          href="/dashboard/funding"
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          📊 Alokasi Profit <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-25 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-green-700">💵 Kas Utama</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-green-600">60% Sales</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl font-bold text-green-700">
                  Rp {balance.kas_utama.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setSelectedDescription('kas_utama')}
                className="text-green-600 hover:text-green-700 p-1"
                title="Penjelasan detail"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-700 bg-white bg-opacity-60 p-2 rounded border border-green-200">
              <p className="font-semibold mb-1">📌 Operasional Harian</p>
              <p>Gaji, sewa, utilitas, kebutuhan harian</p>
              <div className="mt-2 flex items-center gap-1">
                {balance.kas_utama > 0 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-green-600 font-medium">Aman</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Perhatian</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Profit Pending (40% dari penjualan) */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-25 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-blue-700">📊 Profit Pending</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-medium text-blue-600">40% Sales</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl font-bold text-blue-700">
                  Rp {balance.profit_pending.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setSelectedDescription('profit_pending')}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Penjelasan detail"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-700 bg-white bg-opacity-60 p-2 rounded border border-blue-200">
              <p className="font-semibold mb-1">🔒 Siap Dialokasikan</p>
              <p>Menunggu alokasi di akhir bulan</p>
              <div className="mt-2 flex items-center gap-1">
                {balance.profit_pending > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-600 font-medium">Menunggu</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600 font-medium">Kosong</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Simpan Uang (Strategic Reserve) */}
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-25 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-orange-700">🏦 Simpan Uang</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium text-orange-600">Strategic</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl font-bold text-orange-700">
                  Rp {balance.simpan_uang.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setSelectedDescription('simpan_uang')}
                className="text-orange-600 hover:text-orange-700 p-1"
                title="Penjelasan detail"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-700 bg-white bg-opacity-60 p-2 rounded border border-orange-200">
              <p className="font-semibold mb-1">💼 Dana Strategis</p>
              <p>Untuk kebutuhan darurat & investasi</p>
              <div className="mt-2 flex items-center gap-1">
                {balance.simpan_uang > 0 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-orange-600" />
                    <span className="text-orange-600 font-medium">Aktif</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600 font-medium">Kosong</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: Total Available & Hutang Priority */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-25 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-purple-700">💎 Total Tersedia</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-medium text-purple-600">All Buckets</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xl font-bold text-purple-700">
                  Rp {balance.total_available.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setSelectedDescription('total_tersedia')}
                className="text-purple-600 hover:text-purple-700 p-1"
                title="Penjelasan detail"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-700 bg-white bg-opacity-60 p-2 rounded border border-purple-200">
              <p className="font-semibold mb-1">⚖️ Bayar Hutang Dulu</p>
              <p>Alokasi profit prioritaskan pembayaran hutang investor</p>
              <div className="mt-2 text-purple-600 font-medium text-xs">
                ✓ Sistem Otomatis Prioritas
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description Modal */}
      {selectedDescription && (
        <DescriptionModal
          selectedDescription={selectedDescription}
          onClose={() => setSelectedDescription(null)}
        />
      )}

      {/* Last Updated Info */}
      <div className="text-xs text-gray-500 text-center">
        Terakhir diperbarui: {new Date(balance.last_updated).toLocaleTimeString('id-ID')}
        <button
          onClick={() => setRefreshTrigger((t) => t + 1)}
          className="ml-2 text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
