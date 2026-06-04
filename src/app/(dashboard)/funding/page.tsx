'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, Trash } from 'lucide-react';
import { CapitalEntry, Investor, CapitalRepayment, ProfitAllocation, CashTransaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useOutlet } from '@/lib/context/OutletContext';

interface FundingState {
  capitalEntries: CapitalEntry[];
  investors: Investor[];
  repayments: CapitalRepayment[];
  profitAllocations: ProfitAllocation[];
  cashTransactions: CashTransaction[];
  loading: boolean;
  error: string | null;
}

export default function FundingPage() {
  const { outletId } = useOutlet();
  const [activeTab, setActiveTab] = useState('modal');
  const [data, setData] = useState<FundingState>({
    capitalEntries: [],
    investors: [],
    repayments: [],
    profitAllocations: [],
    cashTransactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchAllData();
  }, [outletId]);

  async function fetchAllData() {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [entries, investors, repayments, profitAllocations, cashTransactions] = await Promise.all([
        fetch(`/api/capital?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/investors?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/capital-repayments?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/profit-allocations?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/cash-transactions?outlet_id=${outletId}`).then(r => r.json()),
      ]);

      setData({
        capitalEntries: Array.isArray(entries) ? entries : [],
        investors: Array.isArray(investors) ? investors : [],
        repayments: Array.isArray(repayments) ? repayments : [],
        profitAllocations: Array.isArray(profitAllocations) ? profitAllocations : [],
        cashTransactions: Array.isArray(cashTransactions) ? cashTransactions : [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  // ===== TAB 1: MODAL MASUK =====
  function TabModalMasuk() {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      source_id: '',
      notes: '',
    });
    const [saving, setSaving] = useState(false);

    const selectedSource = data.investors.find((inv: any) => inv.id === formData.source_id);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!selectedSource) {
        alert('Pilih sumber dana terlebih dahulu');
        return;
      }
      
      setSaving(true);
      try {
        const response = await fetch('/api/capital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            date: formData.date,
            amount: parseFloat(formData.amount),
            source: selectedSource.name,
            source_type: selectedSource.source_type || 'investor',
            investor_id: selectedSource.id,
            notes: formData.notes,
          }),
        });
        if (!response.ok) throw new Error('Failed to create capital entry');
        setFormData({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          source_id: '',
          notes: '',
        });
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
        alert('Error saving capital entry');
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Modal Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Jumlah (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Pilih Sumber Dana (Owner/Investor/Karyawan)*</Label>
                <Select value={formData.source_id} onValueChange={(val: any) => setFormData({ ...formData, source_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber dana" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Belum ada role. Buat di halaman Kelola Role.</div>
                    ) : (
                      data.investors.map((inv: any) => {
                        const sourceType = inv.source_type || 'investor';
                        const icon = sourceType === 'owner' ? '👤' : sourceType === 'karyawan' ? '🧑' : '🤝';
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {icon} {inv.name}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedSource && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-gray-700">
                    <span className="font-semibold">{selectedSource.name}</span>
                    {' • '}
                    <span className={selectedSource.source_type === 'owner' ? 'text-blue-600' : selectedSource.source_type === 'karyawan' ? 'text-green-600' : 'text-purple-600'}>
                      {selectedSource.source_type === 'owner' ? '👤 Owner' : selectedSource.source_type === 'karyawan' ? '🧑 Karyawan' : '🤝 Investor'}
                    </span>
                  </p>
                  {selectedSource.phone && (
                    <p className="text-gray-600 text-xs mt-1">📞 {selectedSource.phone}</p>
                  )}
                  {selectedSource.notes && (
                    <p className="text-gray-600 text-xs mt-1">💬 {selectedSource.notes}</p>
                  )}
                </div>
              )}

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
                  rows={3}
                />
              </div>

              <Button 
                type="submit"
                disabled={saving || !selectedSource} 
                className="bg-orange-600 hover:bg-orange-700 w-full"
              >
                {saving ? 'Menyimpan...' : 'Simpan Modal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Modal Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            {data.capitalEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada modal masuk</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Tanggal</th>
                      <th className="text-left p-2">Sumber</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-right p-2">Jumlah</th>
                      <th className="text-left p-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.capitalEntries.map((entry: any) => {
                      const sourceType = entry.source_type || 'investor';
                      const icon = sourceType === 'owner' ? '👤' : sourceType === 'karyawan' ? '🧑' : '🤝';
                      const label = sourceType === 'owner' ? 'Owner' : sourceType === 'karyawan' ? 'Karyawan' : 'Investor';
                      return (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{formatDate(entry.date)}</td>
                          <td className="p-2 font-medium">{entry.source || '-'}</td>
                          <td className="p-2">
                            <Badge variant={sourceType === 'investor' ? 'default' : 'secondary'}>
                              {icon} {label}
                            </Badge>
                          </td>
                          <td className="text-right p-2 font-semibold">{formatCurrency(entry.amount)}</td>
                          <td className="p-2 text-xs text-gray-600">{entry.notes || '-'}</td>
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
    );
  }

  // ===== TAB 2: ALOKASI LABA =====
  function TabAllokasiLaba() {
    const [netProfit, setNetProfit] = useState<number>(0);
    const [kasAmount, setKasAmount] = useState('');
    const [allocationItems, setAllocationItems] = useState<{ investorId: string; name: string; roleType: string; amount: number }[]>([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [itemAmount, setItemAmount] = useState('');
    const [saving, setSaving] = useState(false);

    // Calculate remainder
    const kasNum = parseFloat(kasAmount) || 0;
    const allocatedTotal = allocationItems.reduce((sum, item) => sum + item.amount, 0);
    const remainder = netProfit - kasNum - allocatedTotal;

    async function addAllocationItem() {
      if (!selectedRole) {
        alert('Pilih role');
        return;
      }
      if (!itemAmount || parseFloat(itemAmount) <= 0) {
        alert('Masukkan jumlah');
        return;
      }

      const selected = data.investors.find((inv: any) => inv.id === selectedRole);
      if (!selected) return;

      setAllocationItems([
        ...allocationItems,
        {
          investorId: selected.id,
          name: selected.name,
          roleType: selected.source_type || 'investor',
          amount: parseFloat(itemAmount),
        },
      ]);
      setSelectedRole('');
      setItemAmount('');
    }

    function removeAllocationItem(index: number) {
      setAllocationItems(allocationItems.filter((_, i) => i !== index));
    }

    async function handleSaveAllocation() {
      if (remainder < 0) {
        alert('Total alokasi melebihi sisa! Periksa kembali.');
        return;
      }

      setSaving(true);
      try {
        const response = await fetch('/api/profit-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            allocation_date: new Date().toISOString().split('T')[0],
            period_label: null,
            total_profit: netProfit,
            reserve_amount: kasNum,
            distributed_amount: allocatedTotal,
            notes: `Manual allocation: ${allocationItems.length} entries`,
          }),
        });

        if (!response.ok) throw new Error('Gagal simpan alokasi');

        setKasAmount('');
        setAllocationItems([]);
        await fetchAllData();
        alert('Alokasi laba berhasil disimpan');
      } catch (error) {
        console.error('Error:', error);
        alert('Error saving allocation');
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Laba Bersih</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(netProfit)}</p>
              <p className="text-xs text-gray-500 mt-1">otomatis dari laporan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Ke Kas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(kasNum)}</p>
              <p className="text-xs text-gray-500 mt-1">potongan kas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Dialokasikan</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(allocatedTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">{allocationItems.length} entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Sisa</p>
              <p className={`text-2xl font-bold ${remainder >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {formatCurrency(remainder)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{remainder >= 0 ? 'dapat dibagikan' : 'MELEBIHI!'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Input Kas */}
        <Card>
          <CardHeader>
            <CardTitle>1. Potong Kas</CardTitle>
            <CardDescription>Berapa nominal yang masuk ke kas usaha?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nominal Kas (Rp)</Label>
              <Input
                type="number"
                value={kasAmount}
                onChange={(e) => setKasAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Manual Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>2. Bagikan Sisa Laba</CardTitle>
            <CardDescription>Pilih role → input jumlah → tambahkan ke daftar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Pilih Role</Label>
                <Select value={selectedRole || ''} onValueChange={(val) => setSelectedRole(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Tidak ada role</div>
                    ) : (
                      data.investors.map((inv: any) => {
                        const icon = inv.source_type === 'owner' ? '👤' : inv.source_type === 'karyawan' ? '🧑' : '🤝';
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {icon} {inv.name}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={itemAmount}
                  onChange={(e) => setItemAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={addAllocationItem}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  <Plus className="w-4 h-4 mr-1" /> Tambah
                </Button>
              </div>
            </div>

            {/* Allocation List */}
            {allocationItems.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Daftar Alokasi ({allocationItems.length})</h3>
                <div className="space-y-2">
                  {allocationItems.map((item, idx) => {
                    const icon = item.roleType === 'owner' ? '👤' : item.roleType === 'karyawan' ? '🧑' : '🤝';
                    const label = item.roleType === 'owner' ? 'Owner' : item.roleType === 'karyawan' ? 'Karyawan' : 'Investor';
                    return (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <p className="font-medium">
                            <span className="text-xl mr-2">{icon}</span>
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">{label}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-semibold min-w-max">{formatCurrency(item.amount)}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAllocationItem(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveAllocation}
              disabled={saving || allocationItems.length === 0 || remainder < 0}
              className="w-full bg-green-600 hover:bg-green-700 mt-4"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Menyimpan...' : 'Simpan Alokasi Laba'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TAB 3: PEMBAYARAN KEMBALI =====
  function TabRepayment() {
    const [formData, setFormData] = useState({
      investor_id: '',
      amount: '',
      repayment_date: new Date().toISOString().split('T')[0],
      method: 'cash',
      notes: '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      try {
        const response = await fetch('/api/capital-repayments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            amount: parseFloat(formData.amount),
          }),
        });
        if (!response.ok) throw new Error('Failed to create repayment');
        setFormData({
          investor_id: '',
          amount: '',
          repayment_date: new Date().toISOString().split('T')[0],
          method: 'cash',
          notes: '',
        });
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setSaving(false);
      }
    }

    const selectedInvestor = data.investors.find((inv: any) => inv.id === formData.investor_id);
    const investorCapital = data.capitalEntries
      .filter((c: any) => c.investor_id === formData.investor_id)
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
    const investorRepayments = data.repayments.filter((r: any) => r.investor_id === formData.investor_id);
    const totalRepaid = investorRepayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
    const remaining = investorCapital - totalRepaid;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Pembayaran Kembali</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Pilih Role</Label>
                <Select value={formData.investor_id} onValueChange={(val: any) => setFormData({ ...formData, investor_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role untuk dikembalikan" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors
                      .filter((inv: any) => {
                        const invested = data.capitalEntries.filter((c: any) => c.investor_id === inv.id);
                        return invested.length > 0;
                      })
                      .map((inv: any) => {
                        const icon = inv.source_type === 'owner' ? '👤' : inv.source_type === 'karyawan' ? '🧑' : '🤝';
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {icon} {inv.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvestor && (
                <div className="grid grid-cols-3 gap-4 text-sm p-3 bg-blue-50 rounded">
                  <div>
                    <p className="text-gray-600">Modal Masuk</p>
                    <p className="font-semibold">{formatCurrency(investorCapital)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sudah Dibayar</p>
                    <p className="font-semibold text-green-600">{formatCurrency(totalRepaid)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sisa</p>
                    <p className="font-semibold text-red-600">{formatCurrency(remaining)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Pembayaran</Label>
                  <Input
                    type="date"
                    value={formData.repayment_date}
                    onChange={(e) => setFormData({ ...formData, repayment_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Jumlah (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Metode</Label>
                <Select value={formData.method || 'cash'} onValueChange={(val) => setFormData({ ...formData, method: val || 'cash' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Tunai</SelectItem>
                    <SelectItem value="transfer">💳 Transfer</SelectItem>
                    <SelectItem value="check">📋 Cek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan pembayaran"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {data.repayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-3">
                {data.repayments.map((rep: any) => {
                  const inv = data.investors.find((i: any) => i.id === rep.investor_id);
                  const icon = inv?.source_type === 'owner' ? '👤' : inv?.source_type === 'karyawan' ? '🧑' : '🤝';
                  const label = inv?.source_type === 'owner' ? 'Owner' : inv?.source_type === 'karyawan' ? 'Karyawan' : 'Investor';
                  return (
                    <div key={rep.id} className="border rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          <span className="mr-2">{icon}</span>
                          {inv?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">{label} • {formatDate(rep.repayment_date)}</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatCurrency(rep.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Pendanaan</h1>
        <p className="text-gray-600">Kelola modal, alokasi laba, dan pembayaran</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modal">📥 Modal Masuk</TabsTrigger>
          <TabsTrigger value="alokasi">💰 Alokasi Laba</TabsTrigger>
          <TabsTrigger value="repayment">📤 Pembayaran</TabsTrigger>
        </TabsList>

        <TabsContent value="modal" className="space-y-4">
          {<TabModalMasuk />}
        </TabsContent>

        <TabsContent value="alokasi" className="space-y-4">
          {<TabAllokasiLaba />}
        </TabsContent>

        <TabsContent value="repayment" className="space-y-4">
          {<TabRepayment />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
