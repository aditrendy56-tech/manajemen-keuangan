'use client';

import { useState, useEffect } from 'react';
import { CapitalForm } from '@/components/forms/CapitalForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CapitalEntry } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function CapitalPage() {
  const [entries, setEntries] = useState<CapitalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { outletId } = useOutlet();

  // Fetch capital entries on mount and when outletId changes
  useEffect(() => {
    if (!outletId) return;
    fetchEntries();
  }, [outletId]);

  async function fetchEntries() {
    try {
      setLoading(true);
      const response = await fetch(`/api/capital?outlet_id=${outletId}`);
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data || []);
    } catch (error) {
      console.error('Failed to fetch capital entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    if (!outletId) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save capital entry');
      }

      const newEntry = await response.json();
      setEntries([newEntry, ...entries]);
      alert('Modal berhasil disimpan');
    } catch (error: any) {
      alert(error.message || 'Gagal menyimpan modal');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  const totalCapital = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

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
              {loading ? (
                <div className="text-center py-8 text-gray-500">Memuat data...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada data modal</div>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-semibold">{entry.source}</p>
                        <p className="text-sm text-gray-500">{entry.date}</p>
                      </div>
                      <p className="font-semibold">Rp {(entry.amount || 0).toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <CapitalForm onSubmit={handleSubmit} loading={submitting} />
        </div>
      </div>
    </div>
  );
}