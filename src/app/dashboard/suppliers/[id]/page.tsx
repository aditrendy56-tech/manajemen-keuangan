'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Supplier, SupplierPrice, RawMaterial, MaterialPurchase } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import SupplierPriceForm from '@/components/forms/SupplierPriceForm';
import { formatCurrency, formatDate } from '@/lib/utils';

const OUTLET_ID = '1b2c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPriceForm, setShowPriceForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch supplier
      try {
        const supplierRes = await fetch(
          `/api/suppliers?outlet_id=${OUTLET_ID}`
        );
        if (supplierRes.ok) {
          const suppliers = await supplierRes.json();
          const current = Array.isArray(suppliers)
            ? suppliers.find((s: Supplier) => s.id === supplierId)
            : null;
          setSupplier(current || null);
        } else {
          setSupplier(null);
        }
      } catch (error) {
        console.error('Error fetching supplier:', error);
        setSupplier(null);
      }

      // Fetch supplier prices
      try {
        const pricesRes = await fetch(
          `/api/supplier-prices?supplier_id=${supplierId}`
        );
        if (pricesRes.ok) {
          const data = await pricesRes.json();
          setPrices(Array.isArray(data) ? data : []);
        } else {
          setPrices([]);
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
        setPrices([]);
      }

      // Fetch materials
      try {
        const materialsRes = await fetch(
          `/api/raw-materials?outlet_id=${OUTLET_ID}`
        );
        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(Array.isArray(data) ? data : []);
        } else {
          setMaterials([]);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterials([]);
      }

      // Fetch purchases from this supplier
      try {
        const purchasesRes = await fetch(
          `/api/material-purchases?outlet_id=${OUTLET_ID}&supplier_id=${supplierId}`
        );
        if (purchasesRes.ok) {
          const data = await purchasesRes.json();
          setPurchases(Array.isArray(data) ? data : []);
        } else {
          setPurchases([]);
        }
      } catch (error) {
        console.error('Error fetching purchases:', error);
        setPurchases([]);
      }
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    let active = true;

    const runFetch = async () => {
      await fetchData();
      if (!active) return;
    };

    void runFetch();

    return () => {
      active = false;
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="text-center text-orange-700">Memuat data...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <Alert className="bg-red-50 text-red-800 border-red-200">
          Distributor tidak ditemukan
        </Alert>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-4"
        >
          ← Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-4"
          >
            ← Kembali
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-orange-900 mb-2">
                {supplier.name}
              </h1>
              <p className="text-orange-700">
                Detail distributor dan riwayat harga
              </p>
            </div>
            {supplier.quality_rating && (
              <div className="text-4xl font-bold text-amber-600">
                ⭐ {supplier.quality_rating.toFixed(1)}/5
              </div>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">Kontak</div>
            <div className="font-semibold text-orange-900">
              {supplier.contact_person || '-'}
            </div>
            <div className="text-sm text-gray-600">
              {supplier.phone && `📞 ${supplier.phone}`}
            </div>
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">WhatsApp</div>
            <div className="font-semibold text-orange-900">
              {supplier.whatsapp || '-'}
            </div>
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">Jam Operasional</div>
            <div className="font-semibold text-orange-900">
              {supplier.opening_hours || '-'}
            </div>
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">Keandalan</div>
            <Badge className={`${
              supplier.reliability === 'Excellent'
                ? 'bg-green-100 text-green-800'
                : supplier.reliability === 'Good'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {supplier.reliability || '-'}
            </Badge>
          </Card>
        </div>

        {/* Address & Notes */}
        {supplier.address && (
          <Card className="p-4 mb-8 border-orange-200">
            <div className="text-sm text-gray-600 mb-1">Alamat</div>
            <div className="text-gray-800">{supplier.address}</div>
          </Card>
        )}

        {supplier.notes && (
          <Card className="p-4 mb-8 border-orange-200 bg-amber-50">
            <div className="text-sm text-gray-600 mb-1">Catatan</div>
            <div className="text-gray-800">{supplier.notes}</div>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600">Total Item Harga</div>
            <div className="text-2xl font-bold text-orange-600">
              {prices.length}
            </div>
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600">Total Pembelian</div>
            <div className="text-2xl font-bold text-orange-600">
              {purchases.length}x
            </div>
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="text-sm text-gray-600">Total Spending</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(purchases.reduce((sum, p) => sum + p.total_amount, 0))}
            </div>
          </Card>
        </div>

        {/* Prices Section */}
        <Card className="p-6 mb-8 border-orange-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-orange-900">
              Harga Item dari Distributor Ini
            </h2>
            {!showPriceForm && (
              <Button
                onClick={() => setShowPriceForm(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                + Tambah / Update Harga
              </Button>
            )}
          </div>

          {showPriceForm && (
            <div className="mb-6">
              <SupplierPriceForm
                supplierId={supplierId}
                materials={materials}
                onSuccess={() => {
                  setShowPriceForm(false);
                  fetchData();
                }}
                onCancel={() => setShowPriceForm(false)}
              />
            </div>
          )}

          {prices.length === 0 ? (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              Belum ada harga yang terdaftar untuk distributor ini
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-50 border-b-2 border-orange-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-orange-900">
                      Barang
                    </th>
                    <th className="px-4 py-2 text-right text-orange-900">
                      Harga/Unit
                    </th>
                    <th className="px-4 py-2 text-center text-orange-900">
                      Min Order
                    </th>
                    <th className="px-4 py-2 text-left text-orange-900">
                      Catatan
                    </th>
                    <th className="px-4 py-2 text-center text-orange-900">
                      Update
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => {
                    const material = materials.find(
                      (m) => m.id === price.raw_material_id
                    );
                    return (
                      <tr key={price.id} className="border-b border-orange-100">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {material?.name} ({material?.unit})
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                          {formatCurrency(price.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {price.minimum_order || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {price.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {formatDate(price.last_updated)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Purchase History */}
        <Card className="p-6 border-orange-200">
          <h2 className="text-2xl font-bold text-orange-900 mb-6">
            Riwayat Pembelian dari Distributor Ini
          </h2>

          {purchases.length === 0 ? (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              Belum ada pembelian dari distributor ini
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-50 border-b-2 border-orange-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-orange-900">
                      Tanggal
                    </th>
                    <th className="px-4 py-2 text-left text-orange-900">
                      Barang
                    </th>
                    <th className="px-4 py-2 text-center text-orange-900">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-orange-900">
                      Harga/Unit
                    </th>
                    <th className="px-4 py-2 text-right text-orange-900">
                      Total
                    </th>
                    <th className="px-4 py-2 text-center text-orange-900">
                      Kualitas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => {
                    const material = materials.find(
                      (m) => m.id === purchase.raw_material_id
                    );
                    return (
                      <tr key={purchase.id} className="border-b border-orange-100">
                        <td className="px-4 py-3 text-gray-800">
                          {formatDate(purchase.date)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {material?.name}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {purchase.quantity} {material?.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(purchase.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                          {formatCurrency(purchase.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {purchase.quality && (
                            <Badge className={`${
                              purchase.quality === 'Baik'
                                ? 'bg-green-100 text-green-800'
                                : purchase.quality === 'Kurang'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {purchase.quality}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
