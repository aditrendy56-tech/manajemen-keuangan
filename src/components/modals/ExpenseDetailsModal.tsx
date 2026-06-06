'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ExpenseDetail {
  id: string;
  amount: number;
  category: string;
  description: string;
  notes: string;
  payment_status: string;
  created_at: string;
  raw_material?: string;
  supplier?: string;
  delivery_date?: string;
}

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  outletId: string;
  date: string;
}

export function ExpenseDetailsModal({
  isOpen,
  onClose,
  category,
  outletId,
  date,
}: ExpenseDetailsModalProps) {
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && category && outletId) {
      fetchExpenseDetails();
    }
  }, [isOpen, category, outletId, date]);

  async function fetchExpenseDetails() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dashboard/expenses-details?outlet_id=${outletId}&category=${category}&date=${date}`
      );
      if (!response.ok) throw new Error('Failed to fetch details');
      
      const data = await response.json();
      setExpenses(data.expenses || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching expense details:', error);
      setExpenses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const getCategoryLabel = (cat: string): string => {
    const labels: { [key: string]: string } = {
      bahan: 'Bahan',
      operasional: 'Operasional',
      peralatan: 'Peralatan',
      gabungan: 'Gabungan',
      lain_lain: 'Lain-lain',
    };
    return labels[cat.toLowerCase()] || cat;
  };

  const getCategoryColor = (cat: string): string => {
    const colors: { [key: string]: string } = {
      bahan: 'bg-blue-100 text-blue-800',
      operasional: 'bg-orange-100 text-orange-800',
      peralatan: 'bg-yellow-100 text-yellow-800',
      gabungan: 'bg-purple-100 text-purple-800',
      lain_lain: 'bg-gray-100 text-gray-800',
    };
    return colors[cat.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Pengeluaran - {getCategoryLabel(category)}</DialogTitle>
          <DialogDescription>
            Tanggal: {new Date(date).toLocaleDateString('id-ID')} • Total: Rp {total.toLocaleString('id-ID')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada pengeluaran di kategori ini untuk tanggal {date}
            </div>
          ) : (
            expenses.map((expense: ExpenseDetail, idx: number) => (
              <Card key={expense.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-bold text-lg text-blue-700">
                          Rp {expense.amount.toLocaleString('id-ID')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(expense.category)}`}>
                          {expense.payment_status || 'pending'}
                        </span>
                      </div>

                      {/* Description - For Gabungan items */}
                      {expense.description && (
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          📝 {expense.description}
                        </p>
                      )}

                      {/* Material info - For Bahan category */}
                      {expense.raw_material && (
                        <p className="text-xs text-gray-600 mb-1">
                          Bahan: <span className="font-medium">{expense.raw_material}</span>
                          {expense.supplier && ` • Supplier: ${expense.supplier}`}
                          {expense.delivery_date && ` • Tiba: ${expense.delivery_date}`}
                        </p>
                      )}

                      {/* Notes */}
                      {expense.notes && (
                        <p className="text-xs text-gray-600 italic mt-2 border-l-2 border-gray-300 pl-2">
                          💬 {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    {new Date(expense.created_at).toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!loading && expenses.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Kategori {getCategoryLabel(category)}:</span>
              <span className="text-green-700">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
