'use client';

import { useEffect, useState } from 'react';
import { RawMaterial, MaterialPurchase, SupplierPrice, Supplier } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const OUTLET_ID = '1b2c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q';

interface PriceData {
  date: string;
  [key: string]: string | number;
}

interface SupplierCompare {
  supplier: Supplier;
  price: number;
  lastUpdate: string;
  minOrder?: number;
}

export default function PriceComparisonPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [matRes, supRes, purRes, priceRes] = await Promise.all([
        fetch(`/api/raw-materials?outlet_id=${OUTLET_ID}`),
        fetch(`/api/suppliers?outlet_id=${OUTLET_ID}`),
        fetch(`/api/material-purchases?outlet_id=${OUTLET_ID}`),
        fetch('/api/supplier-prices'),
      ]);

      const matData = await matRes.json();
      const supData = await supRes.json();
      const purData = await purRes.json();
      const priceData = await priceRes.json();

      setMaterials(Array.isArray(matData) ? matData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setPurchases(Array.isArray(purData) ? purData : []);
      setSupplierPrices(Array.isArray(priceData) ? priceData : []);

      if (Array.isArray(matData) && matData.length > 0) {
        setSelectedMaterial(matData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="text-center text-orange-700">Memuat data...</div>
      </div>
    );
  }

  const material = materials.find((m) => m.id === selectedMaterial);
  const materialPrices = supplierPrices.filter(
    (p) => p.raw_material_id === selectedMaterial
  );
  const materialPurchases = purchases.filter(
    (p) => p.raw_material_id === selectedMaterial
  );

  // Prepare data untuk price trend chart
  const priceHistory: PriceData[] = materialPurchases
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({
      date: new Date(p.date).toLocaleDateString('id-ID', {
        month: 'short',
        day: 'numeric',
      }),
      price: p.unit_price,
      supplier: suppliers.find((s) => s.id === p.supplier_id)?.name || 'Unknown',
    }));

  // Group by supplier for trend
  const supplierTrendData: PriceData[] = [];
  const supplierMap: { [key: string]: PriceData } = {};

  materialPurchases.forEach((p) => {
    const supplierName = suppliers.find((s) => s.id === p.supplier_id)?.name || 'Unknown';
    const dateStr = new Date(p.date).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
    });

    if (!supplierMap[dateStr]) {
      supplierMap[dateStr] = { date: dateStr };
    }
    supplierMap[dateStr][supplierName] = p.unit_price;
  });

  Object.values(supplierMap).forEach((item) => {
    supplierTrendData.push(item);
  });

  // Supplier comparison
  const supplierComparison: SupplierCompare[] = materialPrices
    .map((price) => {
      const supplier = suppliers.find((s) => s.id === price.supplier_id);
      return {
        supplier: supplier!,
        price: price.unit_price,
        lastUpdate: price.last_updated,
        minOrder: price.minimum_order,
      };
    })
    .sort((a, b) => a.price - b.price);

  // Calculate statistics
  const avgPrice =
    materialPrices.length > 0
      ? materialPrices.reduce((sum, p) => sum + p.unit_price, 0) / materialPrices.length
      : 0;
  const cheapest = supplierComparison[0];
  const mostExpensive = supplierComparison[supplierComparison.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-900 mb-2">
            Perbandingan Harga Supplier
          </h1>
          <p className="text-orange-700">
            Analisis trend harga dan performa supplier per material
          </p>
        </div>

        {/* Material Selector */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Pilih Material</Label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
          >
            <option value="">-- Pilih Material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
        </div>

        {!material ? (
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            Pilih material terlebih dahulu
          </Alert>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-orange-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-1">Material Dipilih</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {material.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Unit: {material.unit}</div>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-1">Rata-rata Harga</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(avgPrice)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Dari {materialPrices.length} supplier</div>
                </CardContent>
              </Card>

              {cheapest && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-600 mb-1">Termurah</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(cheapest.price)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {cheapest.supplier.name}
                    </div>
                  </CardContent>
                </Card>
              )}

              {mostExpensive && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-600 mb-1">Termahal</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(mostExpensive.price)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {mostExpensive.supplier.name}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Price Trend Chart */}
            {supplierTrendData.length > 0 && (
              <Card className="mb-8 border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-900">
                    Trend Harga per Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={supplierTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) =>
                          typeof value === 'number' ? formatCurrency(value) : value
                        }
                      />
                      <Legend />
                      {supplierComparison.map((item, idx) => (
                        <Line
                          key={item.supplier.id}
                          type="monotone"
                          dataKey={item.supplier.name}
                          stroke={['#ea580c', '#fb923c', '#fcd34d', '#6ee7b7'][idx % 4]}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Supplier Comparison Table */}
            <Card className="mb-8 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-900">
                  Perbandingan Harga Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplierComparison.length === 0 ? (
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                    Belum ada data harga untuk material ini
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-50 border-b-2 border-orange-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-orange-900">Rank</th>
                          <th className="px-4 py-3 text-left text-orange-900">Supplier</th>
                          <th className="px-4 py-3 text-right text-orange-900">Harga/Unit</th>
                          <th className="px-4 py-3 text-right text-orange-900">Selisih vs Termurah</th>
                          <th className="px-4 py-3 text-center text-orange-900">Min Order</th>
                          <th className="px-4 py-3 text-center text-orange-900">Rating</th>
                          <th className="px-4 py-3 text-center text-orange-900">Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierComparison.map((item, idx) => {
                          const priceDiff = item.price - cheapest!.price;
                          const priceDiffPercent =
                            cheapest!.price > 0
                              ? ((priceDiff / cheapest!.price) * 100).toFixed(1)
                              : '0';

                          return (
                            <tr
                              key={item.supplier.id}
                              className={`border-b ${
                                idx === 0
                                  ? 'bg-green-50 border-green-200'
                                  : 'border-orange-100 hover:bg-orange-50'
                              }`}
                            >
                              <td className="px-4 py-3 font-bold text-lg text-orange-600">
                                #{idx + 1}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {item.supplier.name}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-orange-600">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {idx === 0 ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Termurah
                                  </Badge>
                                ) : (
                                  <span className={priceDiff > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {priceDiff > 0 ? '+' : ''}
                                    {formatCurrency(priceDiff)} ({priceDiffPercent}%)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {item.minOrder || '-'}
                              </td>
                              <td className="px-4 py-3 text-center text-amber-600">
                                {item.supplier.quality_rating
                                  ? `⭐ ${item.supplier.quality_rating}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-gray-500">
                                {formatDate(item.lastUpdate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            {cheapest && mostExpensive && (
              <Card className="border-orange-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-orange-900">💡 Analisis Biaya</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-gray-800">
                      💰 <span className="font-semibold">Potensi Hemat:</span> Membeli dari{' '}
                      <span className="font-bold text-green-600">{cheapest.supplier.name}</span> dibanding
                      <span className="font-bold text-red-600"> {mostExpensive.supplier.name}</span>
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(mostExpensive.price - cheapest.price)} per unit{' '}
                      <span className="text-sm text-gray-600">
                        ({(((mostExpensive.price - cheapest.price) / mostExpensive.price) * 100).toFixed(1)}%)
                      </span>
                    </p>
                    {cheapest.supplier.quality_rating && mostExpensive.supplier.quality_rating && (
                      <p className="text-sm text-gray-700 mt-3">
                        ⭐ Kualitas: {cheapest.supplier.name} ({cheapest.supplier.quality_rating}/5) vs{' '}
                        {mostExpensive.supplier.name} ({mostExpensive.supplier.quality_rating}/5)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Label component (if needed)
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium text-gray-700 ${className}`}>{children}</label>;
}
