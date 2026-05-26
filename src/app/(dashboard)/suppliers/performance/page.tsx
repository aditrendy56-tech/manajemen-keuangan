'use client';

import { useEffect, useState } from 'react';
import { Supplier, MaterialPurchase, RawMaterial } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const OUTLET_ID = '1b2c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q';

interface SupplierStats {
  supplier: Supplier;
  totalSpending: number;
  purchaseCount: number;
  avgPrice: number;
  lastPurchase: string;
  qualityAvg: number;
}

export default function SupplierPerformancePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [supRes, purRes, matRes] = await Promise.all([
        fetch(`/api/suppliers?outlet_id=${OUTLET_ID}`),
        fetch(`/api/material-purchases?outlet_id=${OUTLET_ID}`),
        fetch(`/api/raw-materials?outlet_id=${OUTLET_ID}`),
      ]);

      const supData = await supRes.json();
      const purData = await purRes.json();
      const matData = await matRes.json();

      setSuppliers(Array.isArray(supData) ? supData : []);
      setPurchases(Array.isArray(purData) ? purData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
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

  // Calculate supplier statistics
  const supplierStats: SupplierStats[] = suppliers
    .map((supplier) => {
      const supplierPurchases = purchases.filter(
        (p) => p.supplier_id === supplier.id
      );

      const totalSpending = supplierPurchases.reduce(
        (sum, p) => sum + p.total_amount,
        0
      );
      const avgPrice =
        supplierPurchases.length > 0
          ? supplierPurchases.reduce((sum, p) => sum + p.unit_price, 0) /
            supplierPurchases.length
          : 0;

      // Quality average (convert to number: Baik=3, Kurang=2, Rusak=1)
      const qualityAvg =
        supplierPurchases.length > 0
          ? supplierPurchases.reduce((sum, p) => {
              const qualityValue = p.quality === 'Baik' ? 3 : p.quality === 'Kurang' ? 2 : 1;
              return sum + qualityValue;
            }, 0) / supplierPurchases.length
          : 0;

      const lastPurchase =
        supplierPurchases.length > 0
          ? new Date(
              Math.max(...supplierPurchases.map((p) => new Date(p.date).getTime()))
            ).toISOString()
          : '';

      return {
        supplier,
        totalSpending,
        purchaseCount: supplierPurchases.length,
        avgPrice,
        lastPurchase,
        qualityAvg,
      };
    })
    .filter((s) => s.purchaseCount > 0)
    .sort((a, b) => b.totalSpending - a.totalSpending);

  // Data for spending chart
  const spendingChartData = supplierStats.map((s) => ({
    name: s.supplier.name,
    spending: s.totalSpending,
    purchases: s.purchaseCount,
  }));

  // Data for quality chart
  const qualityChartData = supplierStats.map((s) => ({
    name: s.supplier.name,
    quality: parseFloat(s.qualityAvg.toFixed(2)),
  }));

  // Pie chart data
  const pieData = supplierStats.map((s) => ({
    name: s.supplier.name,
    value: s.totalSpending,
  }));

  const COLORS = ['#ea580c', '#fb923c', '#fcd34d', '#6ee7b7', '#34d399', '#10b981'];

  const totalSpending = supplierStats.reduce((sum, s) => sum + s.totalSpending, 0);
  const totalPurchases = supplierStats.reduce((sum, s) => sum + s.purchaseCount, 0);
  const bestSupplier = supplierStats[0];
  const topQualitySupplier = [...supplierStats].sort(
    (a, b) => b.qualityAvg - a.qualityAvg
  )[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-900 mb-2">
            Performa Supplier
          </h1>
          <p className="text-orange-700">
            Analisis spending, kualitas, dan keandalan supplier
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Total Supplier Aktif</div>
              <div className="text-3xl font-bold text-orange-600">
                {supplierStats.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600 mb-1">Total Spending</div>
              <div className="text-3xl font-bold text-orange-600">
                {formatCurrency(totalSpending)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{totalPurchases} pembelian</div>
            </CardContent>
          </Card>

          {bestSupplier && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Top Supplier (Spending)</div>
                <div className="text-lg font-bold text-blue-600">
                  {bestSupplier.supplier.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatCurrency(bestSupplier.totalSpending)}
                </div>
              </CardContent>
            </Card>
          )}

          {topQualitySupplier && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 mb-1">Best Quality</div>
                <div className="text-lg font-bold text-green-600">
                  {topQualitySupplier.supplier.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  ⭐ {topQualitySupplier.qualityAvg.toFixed(1)}/3.0
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Spending Pie Chart */}
        {pieData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-900">
                  Distribusi Spending per Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name} (${((value / totalSpending) * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Supplier Details */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-900">Detail Supplier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {supplierStats.map((stat) => (
                    <div
                      key={stat.supplier.id}
                      className="p-3 bg-orange-50 rounded border border-orange-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-orange-900">
                            {stat.supplier.name}
                          </h4>
                          {stat.supplier.contact_person && (
                            <p className="text-xs text-gray-600">
                              {stat.supplier.contact_person}
                            </p>
                          )}
                        </div>
                        {stat.supplier.quality_rating && (
                          <Badge className="bg-amber-100 text-amber-800">
                            ⭐ {stat.supplier.quality_rating}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Spending:</span>
                          <div className="font-semibold text-orange-600">
                            {formatCurrency(stat.totalSpending)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pembelian:</span>
                          <div className="font-semibold text-orange-600">
                            {stat.purchaseCount}x
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Price:</span>
                          <div className="font-semibold text-orange-600">
                            {formatCurrency(stat.avgPrice)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Quality:</span>
                          <div className="font-semibold text-orange-600">
                            {stat.qualityAvg.toFixed(1)}/3
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spending Chart */}
        <Card className="mb-8 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">
              Total Spending per Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number' ? formatCurrency(value) : value
                  }
                />
                <Legend />
                <Bar dataKey="spending" fill="#ea580c" name="Spending (Rp)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Chart */}
        <Card className="mb-8 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">
              Rata-rata Kualitas Barang per Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={qualityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 3]} label={{ value: 'Baik=3, Kurang=2, Rusak=1', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quality" fill="#10b981" name="Quality Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Table */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">
              Ranking Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierStats.length === 0 ? (
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                Belum ada data supplier dengan pembelian
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50 border-b-2 border-orange-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-orange-900">Rank</th>
                      <th className="px-4 py-3 text-left text-orange-900">Supplier</th>
                      <th className="px-4 py-3 text-center text-orange-900">Pembelian</th>
                      <th className="px-4 py-3 text-right text-orange-900">Total Spending</th>
                      <th className="px-4 py-3 text-right text-orange-900">Avg Price</th>
                      <th className="px-4 py-3 text-center text-orange-900">Kualitas</th>
                      <th className="px-4 py-3 text-center text-orange-900">Reliability</th>
                      <th className="px-4 py-3 text-center text-orange-900">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierStats.map((stat, idx) => (
                      <tr
                        key={stat.supplier.id}
                        className={`border-b ${
                          idx === 0
                            ? 'bg-blue-50 border-blue-200'
                            : 'border-orange-100 hover:bg-orange-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-lg text-orange-600">
                          #{idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {stat.supplier.name}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {stat.purchaseCount}x
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600">
                          {formatCurrency(stat.totalSpending)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(stat.avgPrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`${
                            stat.qualityAvg >= 2.5
                              ? 'bg-green-100 text-green-800'
                              : stat.qualityAvg >= 2
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {stat.qualityAvg.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stat.supplier.reliability && (
                            <Badge className={`${
                              stat.supplier.reliability === 'Excellent'
                                ? 'bg-green-100 text-green-800'
                                : stat.supplier.reliability === 'Good'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {stat.supplier.reliability}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {formatDate(stat.lastPurchase)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
