'use client';

import { useEffect, useState } from 'react';
import { Supplier } from '@/types';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import SupplierForm from '@/components/forms/SupplierForm';

const OUTLET_ID = '1b2c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/suppliers?outlet_id=${OUTLET_ID}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      setError(error.message || 'Gagal mengambil data supplier. Pastikan sudah run migration di Supabase.');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (newSupplier: Supplier) => {
    setShowForm(false);
    fetchSuppliers();
  };

  const getReliabilityColor = (reliability?: string) => {
    switch (reliability) {
      case 'Excellent':
        return 'bg-green-100 text-green-800';
      case 'Good':
        return 'bg-blue-100 text-blue-800';
      case 'Poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-900 mb-2">
            Daftar Distributor / Toko Bahan
          </h1>
          <p className="text-orange-700">
            Kelola supplier dan bandingkan harga untuk pembelian bahan baku
          </p>
        </div>

        {/* Add Button */}
        <div className="flex gap-3 mb-6">
          {!showForm ? (
            <>
              <Link
                href="/suppliers/performance"
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
              >
                📈 Supplier Performance
              </Link>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                + Tambah Distributor Baru
              </Button>
            </>
          ) : (
            <div className="mb-6">
              <SupplierForm
                outletId={OUTLET_ID}
                onSuccess={handleSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
            <strong>Error:</strong> {error}
            <div className="text-xs mt-2">
              Jika ini masalah migration, buka Supabase SQL Editor dan jalankan migration dari file
              <code className="bg-red-100 px-2 py-1 rounded ml-1">migrations/migration-suppliers.sql</code>
            </div>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-8 text-center text-orange-700">
            <p>Memuat data distributor...</p>
          </Card>
        )}

        {/* Empty State */}
        {!loading && suppliers.length === 0 && !showForm && (
          <Card className="p-8 text-center border-2 border-dashed border-orange-200">
            <p className="text-gray-600 mb-4">
              Belum ada distributor. Mulai dengan menambahkan distributor baru.
            </p>
          </Card>
        )}

        {/* Suppliers Grid */}
        {!loading && suppliers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                href={`/suppliers/${supplier.id}`}
              >
                <Card className="h-full p-6 border border-orange-200 hover:border-orange-600 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-orange-900 flex-1">
                      {supplier.name}
                    </h3>
                    {supplier.quality_rating && (
                      <div className="text-sm font-semibold text-amber-700">
                        ⭐ {supplier.quality_rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {supplier.contact_person && (
                    <p className="text-sm text-gray-600 mb-2">
                      Kontak: {supplier.contact_person}
                    </p>
                  )}

                  {supplier.phone && (
                    <p className="text-sm text-gray-600 mb-2">
                      📞 {supplier.phone}
                    </p>
                  )}

                  {supplier.address && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      📍 {supplier.address}
                    </p>
                  )}

                  {supplier.opening_hours && (
                    <p className="text-sm text-gray-600 mb-3">
                      🕐 {supplier.opening_hours}
                    </p>
                  )}

                  {supplier.reliability && (
                    <div className="mb-3">
                      <Badge className={`${getReliabilityColor(supplier.reliability)}`}>
                        {supplier.reliability}
                      </Badge>
                    </div>
                  )}

                  {supplier.notes && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      📝 {supplier.notes}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <Button
                      variant="ghost"
                      className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      Lihat Detail →
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
