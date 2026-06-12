'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

interface TutupBukuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  periodMonth: string;
  outletId: string;
  onSuccess?: () => void;
}

interface PeriodSummary {
  total_revenue: number;
  sessions_count: number;
  kas_utama_percent: number;
  profit_pending_percent: number;
}

interface VarianceData {
  allocated_buffer: number;
  actual_spending: number;
  variance: number;
  variance_percent: number;
  interpretation: string;
}

export function TutupBukuModal({
  open,
  onOpenChange,
  periodId,
  periodMonth,
  outletId,
  onSuccess,
}: TutupBukuModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [variance, setVariance] = useState<VarianceData | null>(null);

  // Load data when modal opens
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch period summary (sessions + revenue)
      const sessionsRes = await fetch(`/api/sessions?outlet_id=${outletId}&period_id=${periodId}`);
      const sessions = await sessionsRes.json();

      const totalRevenue = sessions.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
      const sessionsCount = sessions.length;

      // Fetch allocation rule
      const allocRes = await fetch(`/api/allocation-rules?outlet_id=${outletId}`);
      const allocData = await allocRes.json();
      const allocation = allocData.data;

      setSummary({
        total_revenue: totalRevenue,
        sessions_count: sessionsCount,
        kas_utama_percent: allocation.kas_utama_percent,
        profit_pending_percent: allocation.profit_pending_percent,
      });

      // Calculate variance (allocated buffer vs actual spending)
      const allocatedBuffer = totalRevenue * (allocation.kas_utama_percent / 100);
      
      // Fetch actual spending from expenses
      const expensesRes = await fetch(
        `/api/expenses?outlet_id=${outletId}&period_id=${periodId}&category=operasional`
      );
      const expenses = await expensesRes.json();
      const actualSpending = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      const varianceAmount = allocatedBuffer - actualSpending;
      const variancePercentage = (varianceAmount / allocatedBuffer) * 100;

      let interpretation = '';
      if (variancePercentage > 5) {
        interpretation = `✅ Operasional lebih efisien dari proyeksi. Surplus Rp ${varianceAmount.toLocaleString('id-ID')} dapat dialokasikan ke profit pengganti, investasi, atau kas cadangan.`;
      } else if (variancePercentage < -5) {
        interpretation = `⚠️ Operasional melebihi alokasi. Deficit Rp ${Math.abs(varianceAmount).toLocaleString('id-ID')} perlu ditutup dari profit atau kas cadangan.`;
      } else {
        interpretation = `✏️ Operasional sesuai proyeksi. Variance Rp ${varianceAmount.toLocaleString('id-ID')} dapat dipertimbangkan untuk alokasi berikutnya.`;
      }

      setVariance({
        allocated_buffer: allocatedBuffer,
        actual_spending: actualSpending,
        variance: varianceAmount,
        variance_percent: variancePercentage,
        interpretation,
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Gagal memuat data periode. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTutupBuku() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/periods/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          period_id: periodId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Gagal menutup periode');
      }

      // Success
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menutup periode');
    } finally {
      setLoading(false);
    }
  }

  // Reset state when modal closes
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setStep(1);
      setConfirmed(false);
      setError(null);
      loadData();
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>🔒 Tutup Buku Periode: {periodMonth}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 py-2 px-3 rounded text-center text-sm font-semibold ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s < step ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : `Step ${s}`}
            </div>
          ))}
        </div>

        {/* Step 1: Review Summary */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ringkasan Periode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Periode</p>
                        <p className="text-lg font-bold">{periodMonth}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Sesi</p>
                        <p className="text-lg font-bold">{summary.sessions_count}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        Rp {summary.total_revenue.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Kas Utama (60%)</p>
                        <p className="text-lg font-bold">
                          Rp {(summary.total_revenue * 0.6).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Profit Pending (40%)</p>
                        <p className="text-lg font-bold">
                          Rp {(summary.total_revenue * 0.4).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse h-24 bg-gray-200 rounded"></div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={() => setStep(2)} disabled={loading}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Variance Analysis */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analisis Variance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {variance ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Alokasi Buffer (Kas Utama)</p>
                        <p className="text-lg font-bold text-blue-600">
                          Rp {variance.allocated_buffer.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded">
                        <p className="text-xs text-gray-600 mb-1">Pengeluaran Aktual</p>
                        <p className="text-lg font-bold text-orange-600">
                          Rp {variance.actual_spending.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded border-2 border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-2xl font-bold text-emerald-600">
                          {variance.variance >= 0 ? '+' : ''}{variance.variance_percent.toFixed(1)}%
                        </div>
                        <div className="text-sm font-semibold text-emerald-700">
                          ({variance.variance >= 0 ? 'Surplus' : 'Deficit'})
                        </div>
                      </div>
                      <p className="text-sm text-emerald-700">
                        Rp {Math.abs(variance.variance).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-sm text-blue-800">
                        {variance.interpretation}
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button onClick={() => setStep(3)} disabled={loading}>
                Lanjut <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Lock */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Konfirmasi Tutup Periode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Setelah dikonfirmasi, Anda tidak bisa mengedit sesi periode ini.
                    Semua data akan pindah ke tab "Historical" dan menjadi read-only.
                  </AlertDescription>
                </Alert>

                <div className="p-3 bg-gray-50 rounded space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Periode:</span> {periodMonth}
                  </p>
                  <p>
                    <span className="font-semibold">Total Sesi Terkunci:</span> {summary?.sessions_count}
                  </p>
                  <p>
                    <span className="font-semibold">Periode Baru:</span> Akan dibuat otomatis untuk bulan berikutnya
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-tutup"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="confirm-tutup" className="text-sm">
                    Saya setuju untuk mengunci periode ini dan tidak bisa lagi mengedit sesi lama.
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Kembali
              </Button>
              <Button
                onClick={handleTutupBuku}
                disabled={!confirmed || loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Memproses...' : '✅ Konfirmasi Tutup Buku'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
