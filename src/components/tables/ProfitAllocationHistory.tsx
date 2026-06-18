'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Edit2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProfitAllocation } from '@/types';

interface AllocationBreakdown {
  investor_id: string;
  investor_name: string;
  share_percent: number;
  share_amount: number;
}


interface ProfitAllocationHistoryProps {
  allocations: ProfitAllocation[];
  loading?: boolean;
  onApprove?: (allocation: ProfitAllocation) => void;
  onAmend?: (allocation: ProfitAllocation) => void;
}

export function ProfitAllocationHistory({
  allocations,
  loading = false,
  onApprove,
  onAmend,
}: ProfitAllocationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: '📝 Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: '⏳ Menunggu Approval', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '✅ Disetujui', className: 'bg-green-100 text-green-800' },
      executed: { label: '🎯 Executed', className: 'bg-blue-100 text-blue-800' },
      rejected: { label: '❌ Ditolak', className: 'bg-red-100 text-red-800' },
      amended: { label: '✏️ Diamendment', className: 'bg-purple-100 text-purple-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          <p>Belum ada riwayat alokasi laba</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {allocations.map((allocation) => (
        <Card key={allocation.id} className="hover:shadow-md transition-shadow">
          <div className="p-4">
            {/* Header Row */}
            <div className="grid grid-cols-6 gap-4 items-center">
              {/* Periode */}
              <div>
                <p className="text-sm text-gray-600">Periode</p>
                <p className="font-semibold text-lg">{allocation.allocation_month ?? '-'}</p>
                <p className="text-xs text-gray-500">{formatDate(allocation.allocation_date)}</p>
              </div>

              {/* Profit */}
              <div>
                <p className="text-sm text-gray-600">Profit Pending</p>
                <p className="font-semibold text-green-600">{formatCurrency(allocation.profit_pending_amount ?? 0)}</p>
                <p className="text-xs text-gray-500">Setelah hutang: {formatCurrency(allocation.profit_after_hutang ?? 0)}</p>
              </div>

              {/* Allocation Summary */}
              <div>
                <p className="text-sm text-gray-600">Alokasi</p>
                <div className="text-xs space-y-1 mt-1">
                  <p>💰 Kas Topup: {formatCurrency(allocation.kas_utama_topup ?? 0)}</p>
                  <p>🏦 Simpan: {formatCurrency(allocation.simpan_uang_amount ?? 0)}</p>
                </div>
              </div>

              {/* Employee (if applicable) */}
              <div>
                <p className="text-sm text-gray-600">Karyawan</p>
                {allocation.total_employee_allocation > 0 ? (
                  <p className="font-semibold text-blue-600">{formatCurrency(allocation.total_employee_allocation ?? 0)}</p>
                ) : (
                  <p className="text-xs text-gray-500">-</p>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(allocation.approval_status ?? 'draft')}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {(allocation.approval_status ?? 'draft') === 'draft' && onApprove && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onApprove(allocation)}
                  >
                    Approve
                  </Button>
                )}
                {(allocation.approval_status ?? 'draft') === 'approved' && onAmend && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAmend(allocation)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(expandedId === allocation.id ? null : allocation.id)}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedId === allocation.id ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === allocation.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                {/* Allocation Details */}
                <div>
                  <h4 className="font-semibold mb-3">📊 Detail Alokasi</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-gray-600">User Choice</p>
                      <p className="font-semibold">{allocation.user_choice ?? '-'}</p>
                    </div>
                    {allocation.simpan_reason && (
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-gray-600">Alasan Simpan Uang</p>
                        <p className="font-semibold">{allocation.simpan_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit Share Breakdown (if LUNAS investors) */}
                {allocation.profit_share_breakdown && allocation.profit_share_breakdown.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">💵 Pembagian Profit (LUNAS)</h4>
                    <div className="space-y-2">
                      {allocation.profit_share_breakdown.map((share: AllocationBreakdown) => (
                        <div key={share.investor_id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <div>
                            <p className="text-sm font-semibold">{share.investor_name}</p>
                            <p className="text-xs text-gray-600">{share.share_percent.toFixed(2)}%</p>
                          </div>
                          <p className="font-semibold text-blue-600">{formatCurrency(share.share_amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval Info */}
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">🔍 Info Approval</h4>
                  <div className="space-y-1 text-sm text-blue-900">
                    <p>
                      <strong>Status:</strong> {allocation.approval_status ?? 'draft'}
                    </p>
                    {allocation.approved_by && (
                      <>
                        <p>
                          <strong>Approved by:</strong> {allocation.approved_by}
                        </p>
                        <p>
                          <strong>Approved at:</strong> {formatDate(allocation.approved_at || '')}
                        </p>
                      </>
                    )}
                    {allocation.amended_from_allocation_id && (
                      <div className="mt-2 p-2 bg-purple-100 rounded">
                        <p className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <strong>Amendment dari:</strong> {allocation.amended_from_allocation_id.slice(0, 8)}...
                        </p>
                        {allocation.amendment_reason && (
                          <p className="text-xs mt-1">
                            <strong>Alasan:</strong> {allocation.amendment_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {allocation.notes && (
                  <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">📝 Catatan</p>
                    <p className="text-sm text-yellow-900">{allocation.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
