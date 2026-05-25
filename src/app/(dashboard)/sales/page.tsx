'use client';

import { useState } from 'react';
import { SaleForm } from '@/components/forms/SaleForm';
import { SalesTable } from '@/components/tables/SalesTable';
import { Sale } from '@/types';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([
    {
      id: '1',
      session_id: 'session-1',
      outlet_id: 'outlet-1',
      channel: 'offline',
      payment_method: 'cash',
      gross_amount: 100000,
      platform_fee: 0,
      net_amount: 100000,
      order_ref: undefined,
      notes: 'Penjualan pertama',
      created_at: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const newSale: Sale = {
        id: Math.random().toString(36),
        session_id: 'session-1',
        outlet_id: 'outlet-1',
        ...data,
        created_at: new Date().toISOString(),
      };
      setSales([newSale, ...sales]);
      // Reset form would happen here
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Penjualan</h1>
        <p className="text-gray-600">Input dan kelola data penjualan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesTable sales={sales} />
        </div>
        <div>
          <SaleForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}