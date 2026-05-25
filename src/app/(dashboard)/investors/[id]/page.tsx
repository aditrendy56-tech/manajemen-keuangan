'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import type { Investor, InvestorRepayment } from '@/types';

export default function InvestorDetailPage() {
  const params = useParams();
  const investorId = params.id as string;

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [repayments, setRepayments] = useState<InvestorRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    repayment_date: new Date().toISOString().split('T')[0],
    method: 'cash',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [investorId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get investor from investors list (we'll use a hacky way since no direct GET by ID endpoint)
      // Actually we need to update the page to fetch all investors then filter, or create a detail endpoint
      // For now, let me just load repayments
      const repayRes = await fetch(`/api/capital-repayments?investor_id=${investorId}`);
      if (!repayRes.ok) throw new Error('Failed to load repayments');
      const repayData = await repayRes.json();
      setRepayments(repayData || []);

      // Load investor details from Supabase directly via a manual fetch
      // For now, let's assume we have the investor data - we'll fetch it a different way
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load investor details
  useEffect(() => {
    const fetchInvestor = async () => {
      try {
        // Fetch all investors and find the one matching the ID
        const res = await fetch(`/api/investors?outlet_id=660e8400-e29b-41d4-a716-446655440000`);
        if (!res.ok) throw new Error('Failed to load investor');
        const investors = await res.json();
        const found = investors.find((inv: Investor) => inv.id === investorId);
        if (found) {
          setInvestor(found);
        } else {
          setError('Investor not found');
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    if (!investor && !loading) {
      fetchInvestor();
    }
  }, [investorId, investor, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/capital-repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investor_id: investorId,
          amount: parseFloat(formData.amount) || 0,
          repayment_date: formData.repayment_date,
          method: formData.method,
          notes: formData.notes
        })
      });

      if (!res.ok) throw new Error('Failed to record repayment');
      
      setFormData({
        amount: '',
        repayment_date: new Date().toISOString().split('T')[0],
        method: 'cash',
        notes: ''
      });
      
      await loadData();

      // Reload investor data
      const invRes = await fetch(`/api/investors?outlet_id=660e8400-e29b-41d4-a716-446655440000`);
      const invData = await invRes.json();
      const updated = invData.find((inv: Investor) => inv.id === investorId);
      if (updated) setInvestor(updated);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading...</div>;
  }

  if (!investor) {
    return (
      <div className="space-y-4">
        <Link href="/investors">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Investor
          </Button>
        </Link>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">Investor tidak ditemukan</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalRepaid = repayments.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remainingBalance = investor.remaining_balance;
  const repaymentPercentage = (totalRepaid / investor.initial_contribution) * 100;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/investors">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Daftar Investor
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{investor.name}</h1>
        <p className="mt-2 text-gray-600">Detail investor dan history pengembalian modal</p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Modal Awal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(investor.initial_contribution)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sudah Dikembalikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRepaid)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sisa Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(remainingBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{repaymentPercentage.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Progres Pengembalian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-full flex items-center justify-end pr-3 transition-all"
              style={{ width: `${repaymentPercentage}%` }}
            >
              {repaymentPercentage > 10 && (
                <span className="text-white font-semibold text-sm">{repaymentPercentage.toFixed(0)}%</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repayment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>History Pengembalian</CardTitle>
              <CardDescription>Riwayat semua pengembalian modal</CardDescription>
            </CardHeader>
            <CardContent>
              {repayments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Belum ada pengembalian</div>
              ) : (
                <div className="space-y-3">
                  {repayments.map((repayment) => (
                    <div key={repayment.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{formatDate(repayment.repayment_date)}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          Metode: {repayment.method || 'Cash'}
                        </p>
                        {repayment.notes && (
                          <p className="text-sm text-gray-500 mt-1">{repayment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(repayment.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Repayment Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Catat Pengembalian</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-gray-700">Jumlah (Rp)*</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="500000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal: {formatCurrency(remainingBalance)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="date" className="text-gray-700">Tanggal*</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.repayment_date}
                    onChange={(e) => setFormData({ ...formData, repayment_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="method" className="text-gray-700">Metode</Label>
                  <select
                    id="method"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-gray-700">Catatan</Label>
                  <Input
                    id="notes"
                    placeholder="Catatan pengembalian..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={submitting || remainingBalance === 0}
                >
                  {submitting ? 'Menyimpan...' : remainingBalance === 0 ? 'Sudah Lunas' : 'Catat Pengembalian'}
                </Button>
              </form>

              {investor.phone && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Kontak:</strong> {investor.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
