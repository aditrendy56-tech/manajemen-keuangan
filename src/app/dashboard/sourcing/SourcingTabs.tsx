'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { RawMaterial, Supplier, SupplierPrice, MaterialPurchase, Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SourcingTabsProps {
  data: {
    materials: RawMaterial[];
    suppliers: Supplier[];
    prices: SupplierPrice[];
    purchases: MaterialPurchase[];
    equipment: Expense[];
    loading: boolean;
    error: string | null;
  };
  outletId: string;
  refreshData: () => Promise<void>;
}

export function SourcingTabs({ data, outletId, refreshData }: SourcingTabsProps) {
  const [formDataMaterials, setFormDataMaterials] = useState({
    name: '',
    unit: '',
    reorder_level: '',
  });
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [formDataSuppliers, setFormDataSuppliers] = useState({
    name: '',
    contact_person: '',
    phone: '',
    whatsapp: '',
    address: '',
    opening_hours: '',
    quality_rating: '',
    reliability: 'Good' as Supplier['reliability'],
    notes: '',
  });
  const [savingSuppliers, setSavingSuppliers] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');

  async function handleSubmitMaterial(e: React.FormEvent) {
    e.preventDefault();
    setSavingMaterials(true);
    try {
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          ...formDataMaterials,
          reorder_level: parseFloat(formDataMaterials.reorder_level) || 0,
        }),
      });
      if (!response.ok) throw new Error('Failed to create material');
      setFormDataMaterials({ name: '', unit: '', reorder_level: '' });
      await refreshData();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSavingMaterials(false);
    }
  }

  async function handleSubmitSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSavingSuppliers(true);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          ...formDataSuppliers,
          quality_rating: formDataSuppliers.quality_rating ? parseFloat(formDataSuppliers.quality_rating) : null,
        }),
      });
      if (!response.ok) throw new Error('Failed to create supplier');
      setFormDataSuppliers({
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
      await refreshData();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSavingSuppliers(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tracking Alat & Peralatan</CardTitle>
        </CardHeader>
        <CardContent>
          {data.equipment.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada data alat/peralatan. Input via menu Pengeluaran dengan kategori &quot;Peralatan&quot;.
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
                  {data.equipment.map((item: Expense) => (
                    <tr key={item.id} className="border-b hover:bg-orange-50">
                      <td className="p-2 text-gray-800 font-medium">{item.equipment_name || item.description}</td>
                      <td className="text-right p-2 font-semibold text-orange-600">{formatCurrency(item.amount)}</td>
                      <td className="p-2 text-gray-600">{formatDate(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <strong>Coming Soon!</strong><br />
            Untuk perhitungan bahan dan HPP detail, fitur ini akan dikembangkan lebih lanjut. Saat ini, tracking bahan dapat dilakukan melalui menu Pengeluaran dengan kategori &quot;Bahan&quot;.
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Bahan Baku</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitMaterial} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Bahan</Label>
                <Input value={formDataMaterials.name} onChange={(e) => setFormDataMaterials({ ...formDataMaterials, name: e.target.value })} placeholder="Contoh: Tepung Terigu" required />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={formDataMaterials.unit} onChange={(e) => setFormDataMaterials({ ...formDataMaterials, unit: e.target.value })} placeholder="Contoh: kg, liter, pcs" />
              </div>
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" value={formDataMaterials.reorder_level} onChange={(e) => setFormDataMaterials({ ...formDataMaterials, reorder_level: e.target.value })} placeholder="Minimal stok" />
            </div>
            <Button disabled={savingMaterials} className="bg-orange-600 hover:bg-orange-700">
              {savingMaterials ? 'Menyimpan...' : 'Tambah Bahan'}
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
                  {data.materials.map((m: RawMaterial) => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{m.name}</td>
                      <td className="p-2">{m.unit}</td>
                      <td className="p-2">{m.current_stock || 0}</td>
                      <td className="p-2">{m.reorder_level || '-'}</td>
                      <td className="p-2 text-center">
                        <button onClick={async () => { if (confirm('Hapus bahan baku ini?')) { try { const response = await fetch(`/api/raw-materials/${m.id}`, { method: 'DELETE' }); if (response.ok) { await refreshData(); } } catch (error) { console.error('Delete failed:', error); } } }} className="text-red-600 hover:text-red-800 transition-colors" title="Hapus">
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

      <Card>
        <CardHeader>
          <CardTitle>Tambah Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitSupplier} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nama Supplier</Label><Input value={formDataSuppliers.name} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, name: e.target.value })} required /></div>
              <div><Label>Contact Person</Label><Input value={formDataSuppliers.contact_person} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, contact_person: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={formDataSuppliers.phone} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, phone: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={formDataSuppliers.whatsapp} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, whatsapp: e.target.value })} /></div>
            </div>
            <div><Label>Alamat</Label><Textarea value={formDataSuppliers.address} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Jam Operasional</Label><Input value={formDataSuppliers.opening_hours} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, opening_hours: e.target.value })} placeholder="Contoh: 08:00-17:00" /></div>
              <div><Label>Rating (0-5)</Label><Input type="number" min="0" max="5" step="0.1" value={formDataSuppliers.quality_rating} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, quality_rating: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reliability</Label>
                <Select value={formDataSuppliers.reliability} onValueChange={(val: string) => setFormDataSuppliers({ ...formDataSuppliers, reliability: val as Supplier['reliability'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Catatan</Label><Textarea value={formDataSuppliers.notes} onChange={(e) => setFormDataSuppliers({ ...formDataSuppliers, notes: e.target.value })} /></div>
            <Button disabled={savingSuppliers} className="bg-orange-600 hover:bg-orange-700">{savingSuppliers ? 'Menyimpan...' : 'Tambah Supplier'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Supplier</CardTitle></CardHeader>
        <CardContent>
          {data.suppliers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada supplier</p>
          ) : (
            <div className="grid gap-3">
              {data.suppliers.map((s: Supplier) => (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-orange-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{s.contact_person}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={s.reliability === 'Excellent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : s.reliability === 'Good' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-rose-100 text-rose-800 border-rose-300'}>{s.reliability}</Badge>
                      <button onClick={async () => { if (confirm('Hapus supplier ini?')) { try { const response = await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' }); if (response.ok) { await refreshData(); } } catch (error) { console.error('Delete failed:', error); } } }} className="text-red-600 hover:text-red-800 transition-colors" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2">
                    <p className="flex items-center gap-2"><span className="text-gray-400">📱</span><span>{s.phone || s.whatsapp || '-'}</span></p>
                    <p className="flex items-center gap-2"><span className="text-gray-400">📍</span><span className="line-clamp-1">{s.address || '-'}</span></p>
                    {s.quality_rating && <p className="flex items-center gap-2"><span className="text-yellow-500">⭐</span><span className="font-medium">{s.quality_rating}/5 Rating</span></p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-lg">⏰</span>
          <div>
            <strong>Coming Soon!</strong><br />
            Fitur price comparison dan analisis harga supplier akan segera tersedia dengan antarmuka yang lebih baik.
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Harga per Supplier</CardTitle></CardHeader>
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
                  {data.prices.map((p: SupplierPrice) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{p.suppliers?.name || p.supplier_name || 'Unknown'}</td>
                      <td className="p-2">{p.raw_materials?.name || p.raw_material_name || 'Unknown'}</td>
                      <td className="text-right p-2 font-semibold">{formatCurrency(p.unit_price)}</td>
                      <td className="text-right p-2">{p.minimum_order || '-'}</td>
                      <td className="p-2"><Badge variant={p.is_current ? 'default' : 'outline'}>{p.is_current ? 'Current' : 'Old'}</Badge></td>
                      <td className="p-2 text-xs text-gray-600">{formatDate(p.last_updated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-lg">⏰</span>
          <div>
            <strong>Coming Soon!</strong><br />
            Fitur analisis detail pengeluaran bahan dan biaya produksi akan segera tersedia dengan dashboard yang lebih komprehensif.
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Pilih Bahan</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedMaterial} onValueChange={(val: string) => setSelectedMaterial(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih material untuk analisis" />
            </SelectTrigger>
            <SelectContent>
              {data.materials.map((m: RawMaterial) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMaterial && (() => {
        const materialPrices = data.prices.filter((p: SupplierPrice) => p.raw_material_id === selectedMaterial);
        const chartData = materialPrices.map((p: SupplierPrice) => ({ name: p.suppliers?.name || p.supplier_name || 'Unknown', price: Number(p.unit_price || 0) }));
        const avgPrice = materialPrices.length > 0 ? materialPrices.reduce((sum: number, p: SupplierPrice) => sum + Number(p.unit_price || 0), 0) / materialPrices.length : 0;
        const minPrice = materialPrices.length > 0 ? Math.min(...materialPrices.map((p: SupplierPrice) => Number(p.unit_price || 0))) : 0;
        const maxPrice = materialPrices.length > 0 ? Math.max(...materialPrices.map((p: SupplierPrice) => Number(p.unit_price || 0))) : 0;

        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Rata-rata</p><p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(avgPrice)}</p></CardContent></Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Termurah</p><p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(minPrice)}</p></CardContent></Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Termahal</p><p className="text-3xl font-bold text-rose-600 mt-2">{formatCurrency(maxPrice)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Perbandingan Harga Supplier</CardTitle></CardHeader>
              <CardContent className="pt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }} cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }} />
                      <Bar dataKey="price" fill="#ea580c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-gray-500">Tidak ada data harga untuk material ini</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Detail Harga</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialPrices.map((p: SupplierPrice) => (
                    <div key={p.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <p className="font-medium">{p.supplier_name}</p>
                        <p className="text-xs text-gray-600">Min Order: {p.minimum_order || '-'} | Updated: {formatDate(p.last_updated)}</p>
                      </div>
                      <p className="text-lg font-semibold">{formatCurrency(p.unit_price)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-lg">⏰</span>
          <div>
            <strong>Coming Soon!</strong><br />
            Fitur analisis performa dan KPI inventory akan segera tersedia dengan laporan yang lebih detail.
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Grafik Pengeluaran per Supplier</CardTitle></CardHeader>
        <CardContent className="pt-4">
          {(() => {
            const supplierStats = data.suppliers.map((supplier: Supplier) => {
              const supplierPurchases = data.purchases.filter((p: MaterialPurchase) => p.supplier_id === supplier.id);
              const totalSpending = supplierPurchases.reduce((sum: number, p: MaterialPurchase) => sum + Number(p.total_amount || 0), 0);
              const avgQuality = supplierPurchases.length > 0 ? supplierPurchases.filter((p: MaterialPurchase) => p.quality === 'Baik').length / supplierPurchases.length : 0;
              return { id: supplier.id, name: supplier.name, purchaseCount: supplierPurchases.length, totalSpending, avgPrice: supplierPurchases.length > 0 ? totalSpending / supplierPurchases.length : 0, qualityScore: avgQuality, reliability: supplier.reliability };
            }).sort((a, b) => b.totalSpending - a.totalSpending);
            const chartData = supplierStats.map((s) => ({ name: s.name, spending: s.totalSpending }));
            return supplierStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }} cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }} />
                  <Bar dataKey="spending" fill="#fb923c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">Tidak ada data pembelian</p>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ranking Supplier</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const supplierStats = data.suppliers.map((supplier: Supplier) => {
              const supplierPurchases = data.purchases.filter((p: MaterialPurchase) => p.supplier_id === supplier.id);
              const totalSpending = supplierPurchases.reduce((sum: number, p: MaterialPurchase) => sum + Number(p.total_amount || 0), 0);
              const avgQuality = supplierPurchases.length > 0 ? supplierPurchases.filter((p: MaterialPurchase) => p.quality === 'Baik').length / supplierPurchases.length : 0;
              return { id: supplier.id, name: supplier.name, purchaseCount: supplierPurchases.length, totalSpending, avgPrice: supplierPurchases.length > 0 ? totalSpending / supplierPurchases.length : 0, qualityScore: avgQuality, reliability: supplier.reliability };
            }).sort((a, b) => b.totalSpending - a.totalSpending);
            return (
              <div className="space-y-3">
                {supplierStats.map((stat, idx) => (
                  <div key={stat.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-orange-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">#{idx + 1} {stat.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.purchaseCount} transaksi</p>
                      </div>
                      <Badge variant={stat.reliability === 'Excellent' ? 'default' : 'outline'} className={stat.reliability === 'Excellent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ''}>{stat.reliability}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 rounded-lg p-3"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Pengeluaran</p><p className="font-bold text-orange-600 mt-1">{formatCurrency(stat.totalSpending)}</p></div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-lg p-3"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rata-rata Harga</p><p className="font-bold text-blue-600 mt-1">{formatCurrency(stat.avgPrice)}</p></div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-lg p-3"><p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Quality Score</p><p className="font-bold text-emerald-600 mt-1">{(stat.qualityScore * 100).toFixed(0)}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
