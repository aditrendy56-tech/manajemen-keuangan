'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ModalCategoryForm from '@/components/forms/ModalCategoryForm';
import type { Investor, CapitalEntry } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function InvestorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investorId = params.id as string;
  const { outletId } = useOutlet();

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [capitalEntries, setCapitalEntries] = useState<CapitalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [investorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load investor
      const investorRes = await fetch(`/api/investors?outlet_id=${outletId}`);
      if (!investorRes.ok) throw new Error('Failed to load investor');
      const investors = await investorRes.json();
      const current = investors.find((inv: Investor) => inv.id === investorId);
      if (!current) throw new Error('Investor not found');
      setInvestor(current);

      // Load capital entries for this investor
      const capitalRes = await fetch(`/api/capital?outlet_id=${outletId}`);
      if (!capitalRes.ok) throw new Error('Failed to load capital entries');
      const entries = await capitalRes.json();
      setCapitalEntries(entries.filter((entry: CapitalEntry) => entry.investor_id === investorId) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTotal = (category: string) => {
    return capitalEntries
      .filter(entry => entry.category === category)
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
  };

  const getCategoryEntries = (category: string) => {
    return capitalEntries.filter(entry => entry.category === category);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!investor) return <div className="text-center py-8 text-red-600">Investor tidak ditemukan</div>;

  const categories = [
    { key: 'peralatan', label: '🔧 Peralatan', color: 'bg-blue-50' },
    { key: 'bahan_awal', label: '🛒 Bahan Awal', color: 'bg-green-50' },
    { key: 'rencana_tambahan', label: '📋 Rencana Tambahan', color: 'bg-yellow-50' }
  ];

  const totalCapital = capitalEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/investors">
          <Button variant="ghost" className="mb-4">← Kembali ke Daftar Investor</Button>
        </Link>
        <h1 className="text-3xl font-bold">{investor.name}</h1>
        <p className="text-gray-600 mt-1">
          Prioritas #{investor.priority_order} | Status: <Badge variant={investor.status === 'settled' ? 'default' : 'secondary'}>{investor.status}</Badge>
        </p>
      </div>

      {error && <Alert className="bg-red-50 border-red-200"><AlertDescription className="text-red-700">{error}</AlertDescription></Alert>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Total Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalCapital)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Sudah Dikembalikan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(investor.initial_contribution - investor.remaining_balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">Sisa Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(investor.remaining_balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => {
          const entries = getCategoryEntries(cat.key);
          const total = getCategoryTotal(cat.key);
          
          return (
            <Card key={cat.key} className={cat.color}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{cat.label}</CardTitle>
                    <CardDescription>Total: {formatCurrency(total)}</CardDescription>
                  </div>
                  <Badge variant="outline">{entries.length} entri</Badge>
                </div>
              </CardHeader>

              {entries.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="border-t pt-3 last:border-t-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">{formatDate(entry.date)}</p>
                            {entry.notes && <p className="text-xs text-gray-600">{entry.notes}</p>}
                          </div>
                          <p className="font-bold text-orange-600">{formatCurrency(entry.amount)}</p>
                        </div>

                        {entry.items && entry.items.length > 0 && (
                          <div className="bg-white rounded p-2 mt-2 text-xs space-y-1">
                            {entry.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>• {item.quantity}x {item.name}</span>
                                <span className="text-gray-600">{formatCurrency(item.total_price)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Modal Button */}
      {!showForm ? (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-base"
        >
          + Tambah Modal Kategori
        </Button>
      ) : (
        <div className="space-y-4">
          <ModalCategoryForm 
            investorId={investorId}
            investorName={investor.name}
            onSuccess={() => {
              setShowForm(false);
              loadData();
            }}
          />
          <Button 
            onClick={() => setShowForm(false)}
            variant="outline"
            className="w-full"
          >
            Batal
          </Button>
        </div>
      )}
    </div>
  );
}
