'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, AlertTriangle } from 'lucide-react';
import { RawMaterial, Supplier, SupplierPrice, MaterialPurchase } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useOutlet } from '@/lib/context/OutletContext';

interface TabState {
  materials: RawMaterial[];
  suppliers: Supplier[];
  prices: SupplierPrice[];
  purchases: MaterialPurchase[];
  loading: boolean;
  error: string | null;
}

export default function SourcingPage() {
  const { outletId, sessionId } = useOutlet();
  const [activeTab, setActiveTab] = useState('materials');
  const [data, setData] = useState<TabState>({
    materials: [],
    suppliers: [],
    prices: [],
    purchases: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchAllData();
  }, [outletId]);

  async function fetchAllData() {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [materials, suppliers, prices, purchases] = await Promise.all([
        fetch(`/api/raw-materials?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/suppliers?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/supplier-prices?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/material-purchases?outlet_id=${outletId}`).then(r => r.json()),
      ]);

      setData({
        materials: Array.isArray(materials) ? materials : [],
        suppliers: Array.isArray(suppliers) ? suppliers : [],
        prices: Array.isArray(prices) ? prices : [],
        purchases: Array.isArray(purchases) ? purchases : [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  // ===== TAB 1: Daftar Bahan =====
  function Tab1Materials() {
    const [formData, setFormData] = useState({
      name: '',
      unit: '',
      reorder_level: '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      try {
        const response = await fetch('/api/raw-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            ...formData,
            reorder_level: parseFloat(formData.reorder_level) || 0,
          }),
        });
        if (!response.ok) throw new Error('Failed to create material');
        setFormData({ name: '', unit: '', reorder_level: '' });
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Bahan Baku</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Bahan</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Tepung Terigu"
                    required
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Contoh: kg, liter, pcs"
                  />
                </div>
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  placeholder="Minimal stok"
                />
              </div>
              <Button disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Tambah Bahan'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Bahan Baku</CardTitle>
          </CardHeader>
          <CardContent>
            {data.materials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada bahan baku</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nama</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Stok</th>
                      <th className="text-left p-2">Reorder Level</th>
                      <th className="text-center p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m: any) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{m.name}</td>
                        <td className="p-2">{m.unit}</td>
                        <td className="p-2">{m.current_stock || 0}</td>
                        <td className="p-2">{m.reorder_level || '-'}</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={async () => {
                              if (confirm('Hapus bahan baku ini?')) {
                                try {
                                  const response = await fetch(`/api/raw-materials/${m.id}`, { method: 'DELETE' });
                                  if (response.ok) {
                                    await fetchAllData();
                                  }
                                } catch (error) {
                                  console.error('Delete failed:', error);
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    );
  }

  // ===== TAB 2: Daftar Supplier =====
  function Tab2Suppliers() {
    const [formData, setFormData] = useState({
      name: '',
      contact_person: '',
      phone: '',
      whatsapp: '',
      address: '',
      opening_hours: '',
      quality_rating: '',
      reliability: 'Good',
      notes: '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      try {
        const response = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            ...formData,
            quality_rating: formData.quality_rating ? parseFloat(formData.quality_rating) : null,
          }),
        });
        if (!response.ok) throw new Error('Failed to create supplier');
        setFormData({
          name: '',
          contact_person: '',
          phone: '',
          whatsapp: '',
          address: '',
          opening_hours: '',
          quality_rating: '',
          reliability: 'Good',
          notes: '',
        });
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Supplier</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Alamat</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jam Operasional</Label>
                  <Input
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                    placeholder="Contoh: 08:00-17:00"
                  />
                </div>
                <div>
                  <Label>Rating (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.quality_rating}
                    onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reliability</Label>
                  <Select value={formData.reliability} onValueChange={(val: any) => setFormData({ ...formData, reliability: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Tambah Supplier'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {data.suppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada supplier</p>
            ) : (
              <div className="grid gap-3">
                {data.suppliers.map((s: any) => (
                  <div key={s.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-orange-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{s.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{s.contact_person}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={s.reliability === 'Excellent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : s.reliability === 'Good' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-rose-100 text-rose-800 border-rose-300'}>
                          {s.reliability}
                        </Badge>
                        <button
                          onClick={async () => {
                            if (confirm('Hapus supplier ini?')) {
                              try {
                                const response = await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' });
                                if (response.ok) {
                                  await fetchAllData();
                                }
                              } catch (error) {
                                console.error('Delete failed:', error);
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-2">
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400">📱</span>
                        <span>{s.phone || s.whatsapp || '-'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400">📍</span>
                        <span className="line-clamp-1">{s.address || '-'}</span>
                      </p>
                      {s.quality_rating && (
                        <p className="flex items-center gap-2">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-medium">{s.quality_rating}/5 Rating</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TAB 3: Harga per Supplier =====
  function Tab3Prices() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Harga per Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {data.prices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada harga supplier</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Supplier</th>
                      <th className="text-left p-2">Material</th>
                      <th className="text-right p-2">Harga/Unit</th>
                      <th className="text-right p-2">Min Order</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.prices.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{p.suppliers?.name || p.supplier_name || 'Unknown'}</td>
                        <td className="p-2">{p.raw_materials?.name || p.raw_material_name || 'Unknown'}</td>
                        <td className="text-right p-2 font-semibold">{formatCurrency(p.unit_price)}</td>
                        <td className="text-right p-2">{p.minimum_order || '-'}</td>
                        <td className="p-2">
                          <Badge variant={p.is_current ? 'default' : 'outline'}>
                            {p.is_current ? 'Current' : 'Old'}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-gray-600">{formatDate(p.last_updated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📦 Manajemen Bahan</h1>
        <p className="text-gray-600">Kelola supplier, harga, dan pembelian bahan baku</p>
      </div>

      {data.error && (
        <Alert className="bg-red-50 text-red-800 border-red-200">
          <strong>Error:</strong> {data.error}
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="materials">Bahan</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="prices">Harga</TabsTrigger>
          <TabsTrigger value="analysis">Analisis</TabsTrigger>
          <TabsTrigger value="performance">Performa</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <Tab1Materials />
        </TabsContent>

        <TabsContent value="suppliers">
          <Tab2Suppliers />
        </TabsContent>

        <TabsContent value="prices">
          <Tab3Prices />
        </TabsContent>

        <TabsContent value="analysis">
          <Tab5PriceAnalysis />
        </TabsContent>

        <TabsContent value="performance">
          <Tab6SupplierPerformance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
