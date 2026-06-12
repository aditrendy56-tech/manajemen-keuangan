'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AllocationChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  currentAllocation?: {
    kas_utama_percent: number;
    profit_pending_percent: number;
  };
  recommendedAllocation?: {
    kas_utama_percent: number;
    profit_pending_percent: number;
    reasoning: string;
  };
  onSuccess?: () => void;
}

interface FormData {
  kas_utama_percent: number;
  reason: string;
  notes: string;
  effective_date: string;
}

export function AllocationChangeModal({
  open,
  onOpenChange,
  outletId,
  currentAllocation = { kas_utama_percent: 60, profit_pending_percent: 40 },
  recommendedAllocation,
  onSuccess,
}: AllocationChangeModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    kas_utama_percent: currentAllocation.kas_utama_percent,
    reason: '',
    notes: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const profit_pending_percent = 100 - formData.kas_utama_percent;

  const validateForm = () => {
    if (formData.kas_utama_percent < 0 || formData.kas_utama_percent > 100) {
      setError('Persentase kas utama harus antara 0-100%');
      return false;
    }
    if (!formData.reason) {
      setError('Alasan perubahan wajib diisi');
      return false;
    }
    if (formData.kas_utama_percent === currentAllocation.kas_utama_percent) {
      setError('Persentase harus berbeda dengan alokasi saat ini');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/allocation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          kas_utama_percent: formData.kas_utama_percent,
          profit_pending_percent: profit_pending_percent,
          reason: formData.reason,
          notes: formData.notes,
          effective_from_date: formData.effective_date,
          approved_by: 'system', // TODO: get actual user
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengubah alokasi');
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setStep(1);
        setSuccess(false);
        setFormData({
          kas_utama_percent: currentAllocation.kas_utama_percent,
          reason: '',
          notes: '',
          effective_date: new Date().toISOString().split('T')[0],
        });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecommendation = () => {
    if (recommendedAllocation) {
      setFormData({
        ...formData,
        kas_utama_percent: recommendedAllocation.kas_utama_percent,
        reason: recommendedAllocation.reasoning,
      });
      setStep(2);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ubah Alokasi Kas & Profit</DialogTitle>
        </DialogHeader>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">
              Alokasi berhasil diubah! Perubahan akan berlaku mulai {formData.effective_date}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {/* Current Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alokasi Saat Ini</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Kas Utama (Operasional)</p>
                  <p className="text-2xl font-bold text-blue-600">{currentAllocation.kas_utama_percent}%</p>
                </div>
                <div className="p-3 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600">Profit Pending</p>
                  <p className="text-2xl font-bold text-purple-600">{currentAllocation.profit_pending_percent}%</p>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            {recommendedAllocation && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base">Rekomendasi Sistem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">{recommendedAllocation.reasoning}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded border border-amber-200">
                      <p className="text-sm text-gray-600">Kas Utama (Direkomendasikan)</p>
                      <p className="text-2xl font-bold text-amber-600">{recommendedAllocation.kas_utama_percent}%</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-amber-200">
                      <p className="text-sm text-gray-600">Profit Pending (Direkomendasikan)</p>
                      <p className="text-2xl font-bold text-amber-600">{recommendedAllocation.profit_pending_percent}%</p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={handleUseRecommendation}
                  >
                    Gunakan Rekomendasi Ini
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="pt-4 border-t">
              <Button
                className="w-full"
                onClick={() => setStep(2)}
              >
                Masukkan Alokasi Manual
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Input Kas Utama */}
            <div>
              <label className="block text-sm font-medium mb-2">Kas Utama (Operasional) %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.kas_utama_percent}
                onChange={(e) => setFormData({ ...formData, kas_utama_percent: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Auto-calculated Profit */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-1">Profit Pending (Otomatis)</p>
                <p className="text-3xl font-bold text-purple-600">{profit_pending_percent}%</p>
              </CardContent>
            </Card>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">Alasan Perubahan *</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Alasan --</option>
                <option value="variance_analysis">Variance Analysis (Month 3+)</option>
                <option value="seasonal_adjustment">Seasonal Adjustment</option>
                <option value="investor_request">Investor Request</option>
                <option value="operational_efficiency">Operational Efficiency</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Catatan Tambahan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Jelaskan detail perubahan alokasi..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              />
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Berlaku Mulai Tanggal</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1"
              >
                Kembali
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.reason}
                className="flex-1"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
