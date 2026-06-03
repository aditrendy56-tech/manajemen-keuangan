'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { Expense } from '@/types';

const categoryLabels: Record<string, string> = {
  bahan_baku: 'Bahan Baku',
  operasional: 'Operasional',
  transport: 'Transport',
  peralatan: 'Peralatan',
  lain_lain: 'Lain-lain',
};

const categoryColors: Record<string, string> = {
  bahan_baku: 'bg-blue-100 text-blue-800',
  operasional: 'bg-green-100 text-green-800',
  transport: 'bg-yellow-100 text-yellow-800',
  peralatan: 'bg-purple-100 text-purple-800',
  lain_lain: 'bg-gray-100 text-gray-800',
};

interface ExpensesTableProps {
  expenses: Expense[];
  onDelete?: (id: string) => void;
  onRefund?: (expense: Expense) => void;
}

export function ExpensesTable({ expenses, onDelete, onRefund }: ExpensesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pengeluaran</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Tidak ada data pengeluaran</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Kategori</th>
                  <th className="text-left p-2">Deskripsi</th>
                  <th className="text-right p-2">Jumlah</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{expense.date}</td>
                    <td className="p-2">
                      <Badge className={categoryColors[expense.category]}>
                        {categoryLabels[expense.category]}
                      </Badge>
                    </td>
                    <td className="p-2">{expense.description}</td>
                    <td className="text-right p-2 font-semibold">Rp {expense.amount.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {expense.payment_status === 'refunded' && (
                          <Badge variant="destructive">Refunded</Badge>
                        )}
                        {expense.payment_status === 'pending' && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {expense.payment_status === 'paid' && (
                          <Badge variant="default">Paid</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onRefund && expense.payment_status !== 'refunded' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRefund(expense)}
                            className="text-amber-700 hover:bg-amber-50"
                          >
                            Refund
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(expense.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}