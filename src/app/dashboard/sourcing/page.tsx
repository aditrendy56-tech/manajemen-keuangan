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

  // ===== TAB 4: Riwayat Pembelian =====
  function Tab4Purchases() {
    const [formData, setFormData] = useState({
      raw_material_id: '',
      supplier_id: '',
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      unit_price: '',
      quality: 'Baik',
      invoice_number: '',
      payment_status: 'Paid',
      delivery_date: '',
      notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [purchaseWarning, setPurchaseWarning] = useState<{
      availableCash: number;
      requestedAmount: number;
      shortfall: number;
      message: string;
      pendingData?: any;
    } | null>(null);
    const [forceOverride, setForceOverride] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      console.log('[Material Purchase] handleSubmit called with:', {
        outletId,
        sessionId,
        raw_material_id: formData.raw_material_id,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
      });
      try {
        // Validasi form
        if (!formData.raw_material_id) {
          console.log('[Material Purchase] Validation error: raw_material_id is empty');
          alert('Bahan Baku wajib dipilih');
          setSaving(false);
          return;
        }

        if (!formData.quantity || !formData.unit_price) {
          console.log('[Material Purchase] Validation error: quantity or unit_price is empty');
          alert('Qty dan Harga/Unit wajib diisi');
          setSaving(false);
          return;
        }

        if (!outletId) {
          console.log('[Material Purchase] Validation error: outletId is empty');
          alert('Outlet belum dipilih');
          setSaving(false);
          return;
        }

        if (!sessionId) {
          console.log('[Material Purchase] Validation error: sessionId is empty');
          alert('Session belum tersedia. Buka sesi harian terlebih dahulu.');
          setSaving(false);
          return;
        }

        console.log('[Material Purchase] All validations passed, proceeding with submission');
        setPurchaseError(null);
        const totalAmount = parseFloat(formData.quantity) * parseFloat(formData.unit_price);
        
        console.log('[Material Purchase] Submitting:', {
          outlet_id: outletId,
          session_id: sessionId,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          totalAmount,
          forceOverride,
        });

        const response = await fetch('/api/material-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            outlet_id: outletId,
            force_override: forceOverride,
            ...formData,
            raw_material_id: formData.raw_material_id || null,
            supplier_id: formData.supplier_id || null,
            quantity: parseFloat(formData.quantity),
            unit_price: parseFloat(formData.unit_price),
            total_amount: totalAmount,
          }),
        });
        
        console.log('[Material Purchase] Response status:', response.status);
        console.log('[Material Purchase] Response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.log('[Material Purchase] Error response:', JSON.stringify(errorData, null, 2));
          
          // Handle KAS_TIDAK_CUKUP warning (soft warning, allow override)
          if (errorData.errorType === 'KAS_TIDAK_CUKUP' && !forceOverride) {
            console.log('[Material Purchase] Showing cash warning');
            setPurchaseWarning({
              availableCash: errorData.availableCash,
              requestedAmount: errorData.requestedAmount,
              shortfall: errorData.shortfall,
              message: errorData.message,
              pendingData: formData,
            });
            setSaving(false);
            return;
          }
          
          const errorMsg = errorData.message || errorData.error || errorData.details || 'Gagal membuat pembelian';
          console.error('[Material Purchase] Error detail:', errorMsg);
          setPurchaseError(errorMsg);
          setSaving(false);
          return;
        }
        
        console.log('[Material Purchase] Success!');
        
        setFormData({
          raw_material_id: '',
          supplier_id: '',
          date: new Date().toISOString().split('T')[0],
          quantity: '',
          unit_price: '',
          quality: 'Baik',
          invoice_number: '',
          payment_status: 'Paid',
          delivery_date: '',
          notes: '',
        });
        setPurchaseWarning(null);
        setPurchaseError(null);
        setForceOverride(false);
        await fetchAllData();
      } catch (error) {
        console.error('[Material Purchase] Error:', error);
        const msg = error instanceof Error ? error.message : 'Gagal membuat pembelian';
        setPurchaseError(msg);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        {purchaseWarning && (
          <Alert className="border-yellow-400 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 ml-3">
              <div className="space-y-3">
                <div>
                  <strong>⚠️ Peringatan Kas Tidak Cukup!</strong>
                  <p className="mt-1 text-sm">{purchaseWarning.message}</p>
                </div>
                <div className="bg-white p-3 rounded border border-yellow-200 space-y-1 text-sm">
                  <div>Kas Tersedia: <strong>Rp {purchaseWarning.availableCash.toLocaleString('id-ID')}</strong></div>
                  <div>Yang Diminta: <strong>Rp {purchaseWarning.requestedAmount.toLocaleString('id-ID')}</strong></div>
                  <div className="text-red-600">Kurang: <strong>Rp {purchaseWarning.shortfall.toLocaleString('id-ID')}</strong></div>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-xs">Apakah Anda akan melakukan injeksi modal atau penjualan untuk cover pembelian ini?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPurchaseWarning(null)}
                      className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 rounded text-black"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        setForceOverride(true);
                        setPurchaseWarning(null);
                        setTimeout(() => {
                          const form = document.querySelector('form');
                          if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                          }
                        }, 0);
                      }}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
                    >
                      {saving ? 'Memproses...' : 'Lanjutkan Walaupun Kas Kurang'}
                    </button>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {purchaseError && (
          <Alert className="border-red-400 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 ml-3">
              <div className="space-y-2">
                <strong>❌ Error: Gagal Menyimpan Pembelian</strong>
                <p className="text-sm">{purchaseError}</p>
                <button
                  onClick={() => setPurchaseError(null)}
                  className="text-xs text-red-600 underline hover:text-red-800"
                >
                  Tutup
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Input Pembelian Bahan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bahan Baku</Label>
                  <Select value={formData.raw_material_id} onValueChange={(val: any) => setFormData({ ...formData, raw_material_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahan" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.materials.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Supplier (Optional)</Label>
                  <Select value={formData.supplier_id} onValueChange={(val: any) => setFormData({ ...formData, supplier_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">- Tanpa Supplier -</SelectItem>
                      {data.suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                </div>
                <div>
                  <Label>Harga/Unit</Label>
                  <Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quality</Label>
                  <Select value={formData.quality} onValueChange={(val: any) => setFormData({ ...formData, quality: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baik">Baik</SelectItem>
                      <SelectItem value="Kurang">Kurang</SelectItem>
                      <SelectItem value="Rusak">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(val: any) => setFormData({ ...formData, payment_status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} />
                </div>
                <div>
                  <Label>Delivery Date</Label>
                  <Input type="date" value={formData.delivery_date} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Simpan Pembelian'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            {data.purchases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada pembelian</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Tanggal</th>
                      <th className="text-left p-2">Bahan</th>
                      <th className="text-left p-2">Supplier</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Harga/Unit</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-left p-2">Quality</th>
                      <th className="text-center p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formatDate(p.date)}</td>
                        <td className="p-2">{p.raw_materials?.name || p.raw_material_name || 'Unknown'}</td>
                        <td className="p-2">{p.suppliers?.name || p.supplier_name || '-'}</td>
                        <td className="text-right p-2">{p.quantity}</td>
                        <td className="text-right p-2">{formatCurrency(p.unit_price)}</td>
                        <td className="text-right p-2 font-semibold">{formatCurrency(p.total_amount)}</td>
                        <td className="p-2">
                          <Badge variant={p.quality === 'Baik' ? 'default' : 'secondary'}>{p.quality}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={async () => {
                              if (confirm('Hapus pembelian ini?')) {
                                try {
                                  const response = await fetch(`/api/material-purchases/${p.id}`, { method: 'DELETE' });
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

  // ===== TAB 5: Analisis Harga =====
  function Tab5PriceAnalysis() {
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');

    const materialPrices = selectedMaterial
      ? data.prices.filter((p: any) => p.raw_material_id === selectedMaterial)
      : [];

    const chartData = materialPrices.map((p: any) => ({
      name: p.suppliers?.name || p.supplier_name || 'Unknown',
      price: parseFloat(p.unit_price),
    }));

    const avgPrice = materialPrices.length > 0 
      ? materialPrices.reduce((sum: number, p: any) => sum + parseFloat(p.unit_price), 0) / materialPrices.length 
      : 0;

    const minPrice = materialPrices.length > 0 ? Math.min(...materialPrices.map((p: any) => parseFloat(p.unit_price))) : 0;
    const maxPrice = materialPrices.length > 0 ? Math.max(...materialPrices.map((p: any) => parseFloat(p.unit_price))) : 0;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pilih Bahan</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMaterial} onValueChange={(val: any) => setSelectedMaterial(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih material untuk analisis" />
              </SelectTrigger>
              <SelectContent>
                {data.materials.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMaterial && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Rata-rata</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(avgPrice)}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Termurah</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(minPrice)}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Harga Termahal</p>
                  <p className="text-3xl font-bold text-rose-600 mt-2">{formatCurrency(maxPrice)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Perbandingan Harga Supplier</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                        cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }}
                      />
                      <Bar dataKey="price" fill="#ea580c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-gray-500">Tidak ada data harga untuk material ini</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detail Harga</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialPrices.map((p: any) => (
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
        )}
      </div>
    );
  }

  // ===== TAB 6: Performa Supplier =====
  function Tab6SupplierPerformance() {
    const supplierStats = data.suppliers.map((supplier: any) => {
      const supplierPurchases = data.purchases.filter((p: any) => p.supplier_id === supplier.id);
      const totalSpending = supplierPurchases.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0);
      const avgQuality = supplierPurchases.length > 0 
        ? supplierPurchases.filter((p: any) => p.quality === 'Baik').length / supplierPurchases.length 
        : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        purchaseCount: supplierPurchases.length,
        totalSpending,
        avgPrice: supplierPurchases.length > 0 ? totalSpending / supplierPurchases.length : 0,
        qualityScore: avgQuality,
        reliability: supplier.reliability,
      };
    }).sort((a, b) => b.totalSpending - a.totalSpending);

    const chartData = supplierStats.map(s => ({
      name: s.name,
      spending: s.totalSpending,
    }));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pengeluaran per Supplier</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {supplierStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }}
                  />
                  <Bar dataKey="spending" fill="#fb923c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">Tidak ada data pembelian</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplierStats.map((stat, idx) => (
                <div key={stat.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-orange-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">#{idx + 1} {stat.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.purchaseCount} transaksi</p>
                    </div>
                    <Badge variant={stat.reliability === 'Excellent' ? 'default' : 'outline'} className={stat.reliability === 'Excellent' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ''}>
                      {stat.reliability}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Pengeluaran</p>
                      <p className="font-bold text-orange-600 mt-1">{formatCurrency(stat.totalSpending)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rata-rata Harga</p>
                      <p className="font-bold text-blue-600 mt-1">{formatCurrency(stat.avgPrice)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Quality Score</p>
                      <p className="font-bold text-emerald-600 mt-1">{(stat.qualityScore * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="materials">Bahan</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="prices">Harga</TabsTrigger>
          <TabsTrigger value="purchases">Pembelian</TabsTrigger>
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

        <TabsContent value="purchases">
          <Tab4Purchases />
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
