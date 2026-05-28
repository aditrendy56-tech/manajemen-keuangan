'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Investor } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';

export default function InvestorsPage() {
  const { outletId } = useOutlet();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    initial_contribution: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/investors?outlet_id=${outletId}`);
      if (!res.ok) throw new Error('Failed to load investors');
      const data = await res.json();
      setInvestors(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          name: formData.name,
          phone: formData.phone,
          initial_contribution: parseFloat(formData.initial_contribution) || 0,
          priority_order: investors.length + 1
        })
      });

      if (!res.ok) throw new Error('Failed to add investor');
      
      setFormData({ name: '', phone: '', initial_contribution: '' });
      await loadInvestors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalInvestment = () => {
    return investors.reduce((sum, inv) => sum + (inv.initial_contribution || 0), 0);
  };

  const getTotalRemaining = () => {
    return investors.reduce((sum, inv) => sum + (inv.remaining_balance || 0), 0);
  };

  const getTotalRepaid = () => {
    return getTotalInvestment() - getTotalRemaining();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Investor</h1>
        <p className="mt-2 text-gray-600">Kelola daftar investor dan tracking pengembalian modal</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Investor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{investors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalInvestment())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sudah Dikembalikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalRepaid())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sisa Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(getTotalRemaining())}</div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investors List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Investor</CardTitle>
              <CardDescription>Prioritas pengembalian modal</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-gray-500">Loading...</div>
              ) : investors.length === 0 ? (
                <div className="text-center text-gray-500">Belum ada investor</div>
              ) : (
                <div className="space-y-3">
                  {investors.map((investor) => (
                    <Link key={investor.id} href={`/investors/${investor.id}`}>
                      <div className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{investor.name}</h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                                Priority {investor.priority_order}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Modal: {formatCurrency(investor.initial_contribution)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Sisa: {formatCurrency(investor.remaining_balance)}
                            </p>
                            {investor.phone && (
                              <p className="text-sm text-gray-500 mt-1">{investor.phone}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {((1 - investor.remaining_balance / investor.initial_contribution) * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">dikembalikan</div>
                            <div className="mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                investor.status === 'settled' ? 'bg-green-100 text-green-700' :
                                investor.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {investor.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Investor Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tambah Investor Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-700">Nama*</Label>
                  <Input
                    id="name"
                    placeholder="Nama investor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-700">Nomor HP</Label>
                  <Input
                    id="phone"
                    placeholder="0812-3456-7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="amount" className="text-gray-700">Modal (Rp)*</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000000"
                    value={formData.initial_contribution}
                    onChange={(e) => setFormData({ ...formData, initial_contribution: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={submitting}
                >
                  {submitting ? 'Menambah...' : 'Tambah Investor'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
