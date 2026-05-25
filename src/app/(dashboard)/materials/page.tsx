'use client';

import { useState } from 'react';
import { MaterialPurchaseForm } from '@/components/forms/MaterialPurchaseForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialPurchase } from '@/types';

export default function MaterialsPage() {
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([
    {
      id: '1',
      outlet_id: 'outlet-1',
      raw_material_id: 'mat-1',
      date: new Date().toISOString().split('T')[0],
      quantity: 10,
      unit_price: 50000,
      total_amount: 500000,
      notes: 'Pembelian awal',
      created_at: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const newPurchase: MaterialPurchase = {
        id: Math.random().toString(36),
        outlet_id: 'outlet-1',
        ...data,
        created_at: new Date().toISOString(),
      };
      setPurchases([newPurchase, ...purchases]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pembelian Bahan Baku</h1>
        <p className="text-gray-600">Kelola pembelian bahan baku</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pembelian</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada data pembelian</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Tanggal</th>
                        <th className="text-left p-2">Jumlah</th>
                        <th className="text-right p-2">Harga/Unit</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{purchase.date}</td>
                          <td className="p-2">{purchase.quantity}</td>
                          <td className="text-right p-2">Rp {purchase.unit_price.toLocaleString('id-ID')}</td>
                          <td className="text-right p-2 font-semibold">Rp {purchase.total_amount.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <MaterialPurchaseForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}