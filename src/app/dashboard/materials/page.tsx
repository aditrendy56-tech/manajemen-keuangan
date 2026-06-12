"use client";

import { useEffect, useState } from 'react';
import { MaterialPurchase, RawMaterial, Supplier, SupplierPrice, Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

import { useOutlet } from '@/lib/context/OutletContext';

type TabType = 'alat' | 'bahan' | 'harga' | 'analisis' | 'performa';

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('alat');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [equipment, setEquipment] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    raw_material_id: '',
    supplier_id: '',
    quantity: '',
    unit_price: '',
    quality: 'Baik',
    invoice_number: '',
    payment_status: 'Paid',
    delivery_date: '',
    notes: '',
  });

  const [selectedSupplierPrices, setSelectedSupplierPrices] = useState<SupplierPrice[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { outletId, sessionId, setSessionId } = useOutlet();

  useEffect(() => {
    if (!outletId || sessionId) return;

    async function ensureSession() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/sessions?outlet_id=${outletId}`);

        if (!response.ok) {
          return;
        }

        const sessions = await response.json();
        const todaySession = sessions.sessions && Array.isArray(sessions.sessions)
          ? sessions.sessions.find((s: any) => s.date === today && s.status === 'open')
          : null;

        if (todaySession) {
          setSessionId(todaySession.id);
          return;
        }

        const createResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            date: today,
            opening_cash: 0,
          }),
        });

        if (createResponse.ok) {
          const newSession = await createResponse.json();
          setSessionId(newSession.id);
        }
      } catch (error) {
        console.error('Error ensuring session:', error);
      }
    }

    ensureSession();
  }, [outletId, sessionId, setSessionId]);

  useEffect(() => {
    if (outletId) fetchData();
  }, [outletId]);

  useEffect(() => {
    if (formData.raw_material_id) {
      const prices = supplierPrices.filter(
        (p) => p.raw_material_id === formData.raw_material_id
      );
      setSelectedSupplierPrices(prices);
      
      // Auto-fill unit price from first supplier if available
      if (formData.supplier_id && prices.length > 0) {
        const selected = prices.find((p) => p.supplier_id === formData.supplier_id);
        if (selected && !formData.unit_price) {
          setFormData((prev) => ({
            ...prev,
            unit_price: selected.unit_price.toString(),
          }));
        }
      }
    }
  }, [formData.raw_material_id, supplierPrices, formData.supplier_id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch materials
      try {
        const matRes = await fetch(`/api/raw-materials?outlet_id=${outletId}`);
        if (matRes.ok) {
          const data = await matRes.json();
          setMaterials(Array.isArray(data) ? data : []);
        } else {
          setMaterials([]);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
        setMaterials([]);
      }

      // Fetch suppliers
      try {
        const supRes = await fetch(`/api/suppliers?outlet_id=${outletId}`);
        if (supRes.ok) {
          const data = await supRes.json();
          setSuppliers(Array.isArray(data) ? data : []);
        } else {
          setSuppliers([]);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
      }

      // Fetch supplier prices
      try {
        const priceRes = await fetch('/api/supplier-prices');
        if (priceRes.ok) {
          const data = await priceRes.json();
          setSupplierPrices(Array.isArray(data) ? data : []);
        } else {
          setSupplierPrices([]);
        }
      } catch (error) {
        console.error('Error fetching supplier prices:', error);
        setSupplierPrices([]);
      }

      // Fetch purchases
      try {
        const purchaseRes = await fetch(
          `/api/material-purchases?outlet_id=${outletId}`
        );
        if (purchaseRes.ok) {
          const data = await purchaseRes.json();
          setPurchases(Array.isArray(data) ? data : []);
        } else {
          setPurchases([]);
        }
      } catch (error) {
        console.error('Error fetching purchases:', error);
        setPurchases([]);
      }

      // Fetch equipment (expenses with category='peralatan')
      try {
        const equipRes = await fetch(
          `/api/expenses?outlet_id=${outletId}&category=peralatan`
        );
        if (equipRes.ok) {
          const data = await equipRes.json();
          setEquipment(Array.isArray(data) ? data.filter((e: any) => e.category === 'peralatan') : []);
        } else {
          setEquipment([]);
        }
      } catch (error) {
        console.error('Error fetching equipment:', error);
        setEquipment([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!formData.raw_material_id || !formData.quantity) {
        throw new Error('Material dan quantity harus diisi');
      }

      const payload = {
        session_id: sessionId,
        outlet_id: outletId,
        raw_material_id: formData.raw_material_id,
        supplier_id: formData.supplier_id || null,
        date: formData.date,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        total_amount:
          parseInt(formData.quantity) * parseFloat(formData.unit_price),
        quality: formData.quality,
        invoice_number: formData.invoice_number,
        payment_status: formData.payment_status,
        delivery_date: formData.delivery_date,
        notes: formData.notes,
      };

      const response = await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Gagal menyimpan pembelian');

      setMessage({
        type: 'success',
        text: 'Pembelian bahan berhasil dicatat!',
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        raw_material_id: '',
        supplier_id: '',
        quantity: '',
        unit_price: '',
        quality: 'Baik',
        invoice_number: '',
        payment_status: 'Paid',
        delivery_date: '',
        notes: '',
      });

      fetchData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Gagal menyimpan pembelian',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">Memuat data...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Bahan & Alat</h1>
        <p className="text-gray-600">
          Tracking pembelian bahan baku dan aset peralatan
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-300 overflow-x-auto">
        <button
          onClick={() => setActiveTab('alat')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'alat'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Alat
        </button>
        <button
          onClick={() => setActiveTab('bahan')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'bahan'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📦 Bahan
        </button>
        <button
          onClick={() => setActiveTab('harga')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'harga'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 Harga
        </button>
        <button
          onClick={() => setActiveTab('analisis')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'analisis'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Analisis
        </button>
        <button
          onClick={() => setActiveTab('performa')}
          className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'performa'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚡ Performa
        </button>
      </div>

      {/* Tab Content */}

      {/* Alat Tab */}
      {activeTab === 'alat' && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">Tracking Alat & Peralatan</CardTitle>
          </CardHeader>
          <CardContent>
            {equipment.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada data alat/peralatan. Input via menu Pengeluaran dengan kategori "Peralatan".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50 border-b-2 border-orange-200">
                    <tr>
                      <th className="text-left p-2">Nama Alat</th>
                      <th className="text-right p-2">Harga</th>
                      <th className="text-left p-2">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-orange-50">
                        <td className="p-2 text-gray-800 font-medium">
                          {item.description}
                        </td>
                        <td className="text-right p-2 font-semibold text-orange-600">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-2 text-gray-600">
                          {formatDate(item.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bahan Tab */}
      {activeTab === 'bahan' && (
        <div className="space-y-6">
          {/* Coming Soon Note */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <div className="flex items-start gap-3">
              <span className="text-lg">💡</span>
              <div>
                <strong>Coming Soon!</strong><br />
                Untuk perhitungan bahan dan HPP detail, fitur ini akan dikembangkan lebih lanjut. Saat ini, tracking bahan dapat dilakukan melalui menu Pengeluaran dengan kategori "Bahan".
              </div>
            </div>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-900">Input Pembelian Baru</CardTitle>
                </CardHeader>
                <CardContent>
                  {message && (
                    <Alert
                      className={`mb-4 ${
                        message.type === 'success'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {message.text}
                    </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Tanggal *</Label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Barang *</Label>
                  <select
                    name="raw_material_id"
                    value={formData.raw_material_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Supplier (Optional)</Label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
                  >
                    <option value="">-- Pilih Supplier (opsional) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {selectedSupplierPrices.length > 0 && (
                    <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200 text-xs">
                      <div className="font-semibold text-orange-900 mb-1">
                        Price Comparison untuk item ini:
                      </div>
                      {selectedSupplierPrices.map((price) => {
                        const supplier = suppliers.find(
                          (s) => s.id === price.supplier_id
                        );
                        return (
                          <div
                            key={price.id}
                            className={`py-1 px-2 flex justify-between ${
                              price.supplier_id === formData.supplier_id
                                ? 'bg-green-100 rounded'
                                : ''
                            }`}
                          >
                            <span>{supplier?.name}:</span>
                            <span className="font-semibold">
                              {formatCurrency(price.unit_price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Qty *</Label>
                  <Input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="5"
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Harga/Unit *</Label>
                  <Input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleChange}
                    placeholder="50000"
                    required
                  />
                </div>

                {formData.quantity && formData.unit_price && (
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <div className="text-sm text-gray-600">Total:</div>
                    <div className="text-xl font-bold text-orange-600">
                      {formatCurrency(
                        parseInt(formData.quantity) *
                          parseFloat(formData.unit_price)
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Kualitas Barang</Label>
                  <select
                    name="quality"
                    value={formData.quality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
                  >
                    <option value="baik">Baik</option>
                    <option value="rata_rata">Rata-rata</option>
                    <option value="buruk">Buruk</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">No. Invoice</Label>
                  <Input
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    placeholder="INV-2026-001"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Status Pembayaran</Label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Cicilan">Cicilan</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tanggal Pengiriman</Label>
                  <Input
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Catatan</Label>
                  <Textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Catatan pembelian..."
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pembelian'}
                </Button>
              </form>

              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-sm text-blue-800">
                  💡 Tip: Kunjungi halaman{' '}
                  <Link
                    href="/suppliers"
                    className="font-semibold underline hover:text-blue-900"
                  >
                    Supplier
                  </Link>
                  {' '}untuk mengelola daftar distributor dan harga mereka.
                </div>
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Purchases List */}
            <div className="lg:col-span-2">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-900">
                    Riwayat Pembelian Bahan ({purchases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data pembelian
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-50 border-b-2 border-orange-200">
                          <tr>
                            <th className="text-left p-2">Tanggal</th>
                            <th className="text-left p-2">Supplier</th>
                            <th className="text-left p-2">Barang</th>
                            <th className="text-center p-2">Qty</th>
                            <th className="text-right p-2">Harga/Unit</th>
                            <th className="text-right p-2">Total</th>
                            <th className="text-center p-2">Kualitas</th>
                            <th className="text-center p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchases.map((purchase) => {
                            const material = materials.find(
                              (m) => m.id === purchase.raw_material_id
                            );
                            const supplier = suppliers.find(
                              (s) => s.id === purchase.supplier_id
                            );
                            return (
                              <tr key={purchase.id} className="border-b hover:bg-orange-50">
                                <td className="p-2 text-gray-800">
                                  {formatDate(purchase.date)}
                                </td>
                                <td className="p-2 font-medium text-gray-800">
                                  {supplier?.name || '-'}
                                </td>
                                <td className="p-2 text-gray-800">
                                  {material?.name}
                                </td>
                                <td className="text-center p-2 text-gray-600">
                                  {purchase.quantity} {material?.unit}
                                </td>
                                <td className="text-right p-2 text-gray-600">
                                  {formatCurrency(purchase.unit_price)}
                                </td>
                                <td className="text-right p-2 font-semibold text-orange-600">
                                  {formatCurrency(purchase.total_amount)}
                                </td>
                                <td className="text-center p-2">
                                  {purchase.quality && (
                                    <Badge
                                      className={`${
                                        purchase.quality === 'Baik'
                                          ? 'bg-green-100 text-green-800'
                                          : purchase.quality === 'Kurang'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {purchase.quality}
                                    </Badge>
                                  )}
                                </td>
                                <td className="text-center p-2">
                                  {purchase.payment_status && (
                                    <Badge
                                      className={`${
                                        purchase.payment_status === 'Paid'
                                          ? 'bg-blue-100 text-blue-800'
                                          : purchase.payment_status === 'Pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-orange-100 text-orange-800'
                                      }`}
                                    >
                                      {purchase.payment_status}
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Harga Tab */}
      {activeTab === 'harga' && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">Price Comparison & Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <div className="flex items-start gap-3">
                <span className="text-lg">⏰</span>
                <div>
                  <strong>Coming Soon!</strong><br />
                  Fitur price comparison dan analisis harga supplier akan segera tersedia.
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Analisis Tab */}
      {activeTab === 'analisis' && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">Analisis Bahan & Biaya</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <div className="flex items-start gap-3">
                <span className="text-lg">⏰</span>
                <div>
                  <strong>Coming Soon!</strong><br />
                  Fitur analisis detail pengeluaran bahan dan biaya produksi akan segera tersedia.
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Performa Tab */}
      {activeTab === 'performa' && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-900">Performa & KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <div className="flex items-start gap-3">
                <span className="text-lg">⏰</span>
                <div>
                  <strong>Coming Soon!</strong><br />
                  Fitur analisis performa dan KPI inventory akan segera tersedia.
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}