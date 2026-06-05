'use client';

import { useState } from 'react';
import { CapitalForm } from '@/components/forms/CapitalForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CapitalEntry } from '@/types';

export default function CapitalPage() {
  const [entries, setEntries] = useState<CapitalEntry[]>([
    {
      id: '1',
      outlet_id: 'outlet-1',
      date: new Date().toISOString().split('T')[0],
      amount: 1000000,
      source: 'Tabungan pribadi',
      notes: 'Modal awal',
      created_at: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const newEntry: CapitalEntry = {
        id: Math.random().toString(36),
        outlet_id: 'outlet-1',
        ...data,
        created_at: new Date().toISOString(),
      };
      setEntries([newEntry, ...entries]);
    } finally {
      setLoading(false);
    }
  }

  const totalCapital = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entri Modal</h1>
        <p className="text-gray-600">Kelola entri modal usaha</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Modal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">Rp {totalCapital.toLocaleString('id-ID')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Entri Modal</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada data modal</div>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-semibold">{entry.source}</p>
                        <p className="text-sm text-gray-500">{entry.date}</p>
                      </div>
                      <p className="font-semibold">Rp {entry.amount.toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <CapitalForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}