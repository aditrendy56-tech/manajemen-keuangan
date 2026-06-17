'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOutlet } from '@/lib/context/OutletContext';
import type { Expense, MaterialPurchase, RawMaterial, Supplier, SupplierPrice } from '@/types';
import { SourcingTabs } from './SourcingTabs';

interface TabState {
  materials: RawMaterial[];
  suppliers: Supplier[];
  prices: SupplierPrice[];
  purchases: MaterialPurchase[];
  equipment: Expense[];
  loading: boolean;
  error: string | null;
}

export default function SourcingPage() {
  const { outletId } = useOutlet();
  const [activeTab, setActiveTab] = useState('alat');
  const [data, setData] = useState<TabState>({
    materials: [],
    suppliers: [],
    prices: [],
    purchases: [],
    equipment: [],
    loading: true,
    error: null,
  });

  const fetchAllData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [materials, suppliers, prices, purchases, equipment] = await Promise.all([
        fetch(`/api/raw-materials?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/suppliers?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/supplier-prices?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/material-purchases?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/expenses?outlet_id=${outletId}&category=peralatan`).then(r => r.json()).catch(() => []),
      ]);

      setData({
        materials: Array.isArray(materials) ? materials : [],
        suppliers: Array.isArray(suppliers) ? suppliers : [],
        prices: Array.isArray(prices) ? prices : [],
        purchases: Array.isArray(purchases) ? purchases : [],
        equipment: Array.isArray(equipment) ? equipment.filter((item: Expense) => item.category === 'peralatan') : [],
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat data sourcing';
      setData(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [outletId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAllData]);

  if (data.loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📦 Manajemen Bahan</h1>
        <p className="text-gray-600">Kelola supplier, harga, dan pembelian bahan baku</p>
      </div>

      {data.error && (
        <Alert className="bg-red-50 text-red-800 border-red-200">
          <strong>Error:</strong> {data.error}
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="alat">🔧 Alat</TabsTrigger>
          <TabsTrigger value="materials">📦 Bahan</TabsTrigger>
          <TabsTrigger value="prices">💰 Harga</TabsTrigger>
          <TabsTrigger value="analysis">📊 Analisis</TabsTrigger>
          <TabsTrigger value="performance">⚡ Performa</TabsTrigger>
        </TabsList>

        <TabsContent value="alat">
          <SourcingTabs data={data} outletId={outletId} refreshData={fetchAllData} />
        </TabsContent>
        <TabsContent value="materials">
          <SourcingTabs data={data} outletId={outletId} refreshData={fetchAllData} />
        </TabsContent>
        <TabsContent value="prices">
          <SourcingTabs data={data} outletId={outletId} refreshData={fetchAllData} />
        </TabsContent>
        <TabsContent value="analysis">
          <SourcingTabs data={data} outletId={outletId} refreshData={fetchAllData} />
        </TabsContent>
        <TabsContent value="performance">
          <SourcingTabs data={data} outletId={outletId} refreshData={fetchAllData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
