'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/types';

interface SalesTableProps {
  sales: Sale[];
}

export function SalesTable({ sales }: SalesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Tidak ada data penjualan</div>
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
                      <Badge variant={sale.payment_method === 'cash' ? 'default' : 'secondary'}>
                        {sale.payment_method === 'cash' ? 'Cash' : 'QRIS'}
                      </Badge>
                    </td>
                    <td className="text-right p-2">Rp {sale.gross_amount.toLocaleString('id-ID')}</td>
                    <td className="text-right p-2">Rp {sale.platform_fee.toLocaleString('id-ID')}</td>
                    <td className="text-right p-2 font-semibold">Rp {sale.net_amount.toLocaleString('id-ID')}</td>
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