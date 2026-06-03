'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { Sale } from '@/types';

interface SalesTableProps {
  sales: Sale[];
  onDelete?: (id: string) => void;
  onRefund?: (sale: Sale) => void;
  withCard?: boolean;
}

export function SalesTable({ sales, onDelete, onRefund, withCard = true }: SalesTableProps) {
  const content = (
    <>
      {sales.length === 0 ? (
        <div className="py-8 text-center text-gray-500">Tidak ada data penjualan</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Tanggal</th>
                <th className="text-left p-2">Channel</th>
                <th className="text-left p-2">Metode</th>
                <th className="text-right p-2">Kotor</th>
                <th className="text-right p-2">Fee</th>
                <th className="text-right p-2">Bersih</th>
                <th className="text-center p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{new Date(sale.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="capitalize">
                      {sale.channel}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={sale.payment_method === 'cash' ? 'default' : 'secondary'}>
                        {sale.payment_method === 'cash' ? 'Cash' : sale.payment_method === 'qris' ? 'QRIS' : 'Split'}
                      </Badge>
                      {sale.payment_status === 'refunded' && (
                        <Badge variant="destructive">Refunded</Badge>
                      )}
                      {sale.payment_status === 'pending' && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-right p-2">Rp {sale.gross_amount.toLocaleString('id-ID')}</td>
                  <td className="text-right p-2">Rp {sale.platform_fee.toLocaleString('id-ID')}</td>
                  <td className="text-right p-2 font-semibold">Rp {sale.net_amount.toLocaleString('id-ID')}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onRefund && sale.payment_status !== 'refunded' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRefund(sale)}
                          className="text-amber-700 hover:bg-amber-50"
                        >
                          Refund
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(sale.id)}
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
    </>
  );

  if (!withCard) {
    return <>{content}</>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Penjualan</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}