'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProfitAllocation } from '@/types';

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ProfitAllocation | null;
  onApprove: (allocation_id: string, approval_notes: string) => Promise<void>;
  loading?: boolean;
}

export function ProfitAllocationApprovalModal({
  open,
  onOpenChange,
  allocation,
  onApprove,
}: ApprovalModalProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApprove = async () => {
    if (!allocation) return;

    try {
      setApproving(true);
      setError(null);
      await onApprove(allocation.id, approvalNotes);
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setApprovalNotes('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setApproving(false);
    }
  };

  if (!allocation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve Alokasi Laba - {allocation.allocation_month}</DialogTitle>
        </DialogHeader>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">
              Alokasi laba berhasil disetujui!
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">📋 Ringkasan Alokasi</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Profit Pending</p>
                <p className="font-semibold text-lg text-blue-600">
                  {formatCurrency(allocation.profit_pending_amount ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Setelah Hutang</p>
                <p className="font-semibold text-lg text-blue-600">
                  {formatCurrency(allocation.profit_after_hutang ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Kas Topup</p>
                <p className="font-semibold">{formatCurrency(allocation.kas_utama_topup ?? 0)}</p>
              </div>
              <div>
                <p className="text-gray-600">Simpan Uang</p>
                <p className="font-semibold">{formatCurrency(allocation.simpan_uang_amount ?? 0)}</p>
              </div>
              {(allocation.total_employee_allocation ?? 0) > 0 && (
                <div>
                  <p className="text-gray-600">Alokasi Karyawan</p>
                  <p className="font-semibold">{formatCurrency(allocation.total_employee_allocation ?? 0)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Catatan Approval (Opsional)</label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Catatan approval - contoh: sudah terverifikasi, sesuai dengan laporan, dll..."
              rows={4}
            />
          </div>

          {/* Warning */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 ml-2">
              Setelah di-approve, alokasi ini tidak bisa langsung di-edit. Jika perlu mengubah, buat allocation amendment.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={approving}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || success}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {approving ? 'Menyetujui...' : success ? '✅ Disetujui' : '✅ Approve Alokasi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
