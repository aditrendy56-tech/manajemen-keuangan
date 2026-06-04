'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, PencilLine, Plus, Save } from 'lucide-react';
import { CapitalEntry, Investor, CapitalRepayment, ProfitAllocation, CashTransaction, Stakeholder } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useOutlet } from '@/lib/context/OutletContext';

interface FundingState {
  capitalEntries: CapitalEntry[];
  investors: Investor[];
  repayments: CapitalRepayment[];
  profitAllocations: ProfitAllocation[];
  cashTransactions: CashTransaction[];
  stakeholders: Stakeholder[];
  loading: boolean;
  error: string | null;
}

const COLORS = ['#ea580c', '#fb923c', '#fed7aa', '#fecaca', '#86efac'];

export default function FundingPage() {
  const { outletId } = useOutlet();
  const [activeTab, setActiveTab] = useState('role');
  const [data, setData] = useState<FundingState>({
    capitalEntries: [],
    investors: [],
    repayments: [],
    profitAllocations: [],
    cashTransactions: [],
    stakeholders: [],
    loading: true,
    error: null,
  });

  // Top-level stakeholder state shared across tabs
  const [editingStakeholderId, setEditingStakeholderId] = useState<string | null>(null);
  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    role: 'owner',
    investor_id: '',
    notes: '',
    is_active: true,
  });
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null);
  const [investorForm, setInvestorForm] = useState({
    source_type: 'investor' as 'owner' | 'investor',
    name: '',
    phone: '',
    notes: '',
  });
  const [investorSubmitting, setInvestorSubmitting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [outletId]);

  async function fetchAllData() {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [entries, investors, repayments, profitAllocations, cashTransactions, stakeholders] = await Promise.all([
        fetch(`/api/capital?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/investors?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/capital-repayments?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/profit-allocations?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/cash-transactions?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/stakeholders?outlet_id=${outletId}`).then(r => r.json()),
      ]);

      setData({
        capitalEntries: Array.isArray(entries) ? entries : [],
        investors: Array.isArray(investors) ? investors : [],
        repayments: Array.isArray(repayments) ? repayments : [],
        profitAllocations: Array.isArray(profitAllocations) ? profitAllocations : [],
        cashTransactions: Array.isArray(cashTransactions) ? cashTransactions : [],
        stakeholders: Array.isArray(stakeholders) ? stakeholders : [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  async function submitStakeholder() {
    try {
      if (stakeholderForm.role === 'owner' || stakeholderForm.role === 'investor') {
        if (!stakeholderForm.investor_id) {
          alert('Pilih sumber dana yang sudah terdaftar untuk role owner/investor');
          return;
        }
      }

      if ((stakeholderForm.role === 'karyawan' || stakeholderForm.role === 'other') && !stakeholderForm.name) {
        alert('Isi nama stakeholder untuk role karyawan/other');
        return;
      }

      const selectedSource = data.investors.find((inv: any) => inv.id === stakeholderForm.investor_id);
      const body = {
        outlet_id: outletId,
        name: (stakeholderForm.role === 'owner' || stakeholderForm.role === 'investor')
          ? selectedSource?.name || stakeholderForm.name
          : stakeholderForm.name,
        role: stakeholderForm.role,
        investor_id: stakeholderForm.investor_id || null,
        default_share_percent: 0,
        notes: stakeholderForm.notes || '',
        is_active: stakeholderForm.is_active,
      };

      const response = editingStakeholderId
        ? await fetch(`/api/stakeholders/${editingStakeholderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/stakeholders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (!response.ok) throw new Error('Gagal simpan stakeholder');

      setStakeholderForm({
        name: '',
        role: 'owner',
        investor_id: '',
        notes: '',
        is_active: true,
      });
      setEditingStakeholderId(null);
      await fetchAllData();
    } catch (error) {
      console.error('Stakeholder save error:', error);
      alert('Error saving stakeholder');
    }
  }

  async function submitInvestorRaw() {
    try {
      setInvestorSubmitting(true);
      const payload = {
        outlet_id: outletId,
        source_type: investorForm.source_type,
        name: investorForm.name,
        phone: investorForm.phone || null,
        notes: investorForm.notes || null,
        priority_order: editingInvestorId ? undefined : data.investors.length + 1,
      };

      if (editingInvestorId) {
        const res = await fetch('/api/investors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingInvestorId, ...payload }),
        });
        if (!res.ok) throw new Error('Gagal update sumber dana');
      } else {
        const res = await fetch('/api/investors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal tambah sumber dana');
      }

      setInvestorForm({
        source_type: 'investor',
        name: '',
        phone: '',
        notes: '',
      });
      setEditingInvestorId(null);
      await fetchAllData();
    } catch (error) {
      console.error('Investor save error:', error);
      alert('Error saving investor');
    } finally {
      setInvestorSubmitting(false);
    }
  }

  const submitInvestor = useCallback(submitInvestorRaw, [editingInvestorId, investorForm, outletId, data.investors.length]);

  async function handleDeleteInvestorRaw(id: string) {
    if (!confirm('Hapus sumber dana ini?')) return;
    try {
      setInvestorSubmitting(true);
      const res = await fetch(`/api/investors/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal hapus sumber dana');
      await fetchAllData();
    } catch (error) {
      console.error('Delete investor error:', error);
      alert('Error deleting investor');
    } finally {
      setInvestorSubmitting(false);
    }
  }

  const handleDeleteInvestor = useCallback(handleDeleteInvestorRaw, []);

  function handleEditInvestorRaw(source: any) {
    setInvestorForm({
      source_type: source.source_type || 'investor',
      name: source.name,
      phone: source.phone || '',
      notes: source.notes || '',
    });
    setEditingInvestorId(source.id);
  }

  const handleEditInvestor = useCallback(handleEditInvestorRaw, []);

  // ===== TAB 1: Riwayat Modal =====
  function Tab1CapitalHistory() {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      source_id: '', // Selected source (investor/owner from list)
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
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Pilih Sumber Dana*</Label>
                <Select value={formData.source_id} onValueChange={(val: any) => setFormData({ ...formData, source_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber dana" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Belum ada sumber dana. Tambahkan di halaman Sumber Dana.</div>
                    ) : (
                      data.investors.map((inv: any) => {
                        const sourceType = inv.source_type || 'investor';
                        const icon = sourceType === 'owner' ? '👤' : '🤝';
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
                    <span className={selectedSource.source_type === 'owner' ? 'text-blue-600' : 'text-purple-600'}>
                      {selectedSource.source_type === 'owner' ? '👤 Owner' : '🤝 Investor'}
                    </span>
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    Modal awal: {formatCurrency(selectedSource.initial_contribution)}
                  </p>
                  {selectedSource.notes && (
                    <p className="text-gray-600 text-xs mt-1">Catatan: {selectedSource.notes}</p>
                  )}
                </div>
              )}

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Modal awal untuk peralatan"
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
            <CardTitle>Riwayat Modal</CardTitle>
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
                      <th className="text-left p-2">Tipe</th>
                      <th className="text-right p-2">Jumlah</th>
                      <th className="text-left p-2">Catatan</th>
                      <th className="text-center p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.capitalEntries.map((entry: any) => {
                      const sourceType = entry.source_type || 'investor';
                      return (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{formatDate(entry.date)}</td>
                          <td className="p-2 font-medium">{entry.source || '-'}</td>
                          <td className="p-2">
                            <Badge variant={sourceType === 'investor' ? 'default' : 'secondary'}>
                              {sourceType === 'owner' ? '👤 Owner' : '🤝 Investor'}
                            </Badge>
                          </td>
                          <td className="text-right p-2 font-semibold">{formatCurrency(entry.amount)}</td>
                          <td className="p-2 text-xs text-gray-600">{entry.notes || '-'}</td>
                          <td className="p-2 text-center">
                            <button
                              onClick={async () => {
                                if (confirm('Hapus modal masuk ini?')) {
                                  try {
                                    const response = await fetch(`/api/capital/${entry.id}`, { method: 'DELETE' });
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

  // ===== TAB 2: Info Role =====
  const Tab2InvestorProfilesComponent = useMemo(() => (
    <div className="space-y-6">
      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Kelola Role di Halaman Terpisah</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900">
          <p className="mb-3">
            Untuk menambah, mengedit, atau menghapus role (owner, investor, karyawan), silakan kunjungi halaman <strong>Kelola Role</strong>.
          </p>
          <p className="text-sm mb-4">
            Role yang sudah terdaftar di sini akan digunakan saat alokasi laba dan pelaporan.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/investors'} className="bg-blue-600 hover:bg-blue-700">
            ➜ Buka Halaman Kelola Role
          </Button>
        </CardContent>
      </Card>

      {/* Daftar Role Ringkas */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Role Saat Ini</CardTitle>
          <CardDescription>Role yang tersedia untuk alokasi laba</CardDescription>
        </CardHeader>
        <CardContent>
          {data.investors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada role terdaftar. Buat di halaman Kelola Role.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.investors.map((inv: any) => {
                const sourceType = inv.source_type || 'investor';
                const icon = sourceType === 'owner' ? '👤' : sourceType === 'karyawan' ? '🧑' : '🤝';
                const roleLabel = sourceType === 'owner' ? 'Owner' : sourceType === 'karyawan' ? 'Karyawan' : 'Investor';
                
                return (
                  <div key={inv.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <h3 className="font-semibold text-gray-900">{inv.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{roleLabel}</p>
                        {inv.phone && (
                          <p className="text-xs text-gray-500 mt-1">{inv.phone}</p>
                        )}
                        {inv.notes && (
                          <p className="text-xs text-gray-600 italic mt-2">Catatan: {inv.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  ), [data.investors]);

  // ===== TAB 3: Saldo Investor =====
  function Tab3InvestorBalance() {
    const investorBalances = data.investors
      .map((inv: any) => {
        const totalCapital = data.capitalEntries
          .filter((c: any) => c.investor_id === inv.id)
          .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
        const investorRepayments = data.repayments.filter((r: any) => r.investor_id === inv.id);
        const totalRepaid = investorRepayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
        return {
          ...inv,
          totalCapital,
          totalRepaid,
          remaining: totalCapital - totalRepaid,
          repaymentCount: investorRepayments.length,
        };
      })
      .sort((a, b) => (a.priority_order || 999) - (b.priority_order || 999));

    const totalFunding = data.capitalEntries.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount || 0), 0);
    const totalRepaid = data.repayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
    const totalRemaining = totalFunding - totalRepaid;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stakeholder</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingStakeholderId(null);
                setStakeholderForm({ name: '', role: 'owner', investor_id: '', notes: '', is_active: true });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Baru
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
                Pilih role dulu. Untuk role <strong>Owner</strong> / <strong>Investor</strong>, nama stakeholder akan diambil dari data sumber dana yang sudah terdaftar. Untuk role <strong>Karyawan</strong> / <strong>Other</strong>, masukkan nama secara manual.
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={stakeholderForm.role}
                  onValueChange={(val: any) => setStakeholderForm({
                    ...stakeholderForm,
                    role: val,
                    investor_id: val === 'investor' || val === 'owner' ? stakeholderForm.investor_id : '',
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">👤 Owner</SelectItem>
                    <SelectItem value="investor">🤝 Investor</SelectItem>
                    <SelectItem value="karyawan">🧑 Karyawan</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {stakeholderForm.role === 'owner' || stakeholderForm.role === 'investor' ? (
                  <div>
                    <Label>{stakeholderForm.role === 'owner' ? 'Pilih Owner' : 'Pilih Investor'}</Label>
                    <Select value={stakeholderForm.investor_id} onValueChange={(val: any) => setStakeholderForm({ ...stakeholderForm, investor_id: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder={stakeholderForm.role === 'owner' ? 'Pilih owner' : 'Pilih investor'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">- Pilih dari Daftar Role -</SelectItem>
                        {data.investors
                          .filter((inv: any) => inv.source_type === stakeholderForm.role)
                          .map((inv: any) => (
                            <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Nama stakeholder akan diambil dari daftar role yang sudah terdaftar.</p>
                  </div>
                ) : (
                  <div>
                    <Label>Nama</Label>
                    <Input value={stakeholderForm.name} onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })} placeholder="Nama stakeholder" />
                    <p className="text-xs text-gray-500 mt-1">Masukkan nama karyawan atau stakeholder lain.</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={stakeholderForm.notes} onChange={(e) => setStakeholderForm({ ...stakeholderForm, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={submitStakeholder} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-1" /> {editingStakeholderId ? 'Update' : 'Simpan'}
                </Button>
                {editingStakeholderId && (
                  <Button type="button" variant="outline" onClick={() => setEditingStakeholderId(null)}>Batal edit</Button>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {data.stakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada stakeholder</p>
                ) : (
                  data.stakeholders.map((item) => {
                    const investor = data.investors.find((inv: any) => inv.id === item.investor_id);
                    return (
                      <div key={item.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {item.role === 'owner' || item.role === 'founder' 
                              ? '👤 Owner' 
                              : item.role === 'investor' 
                              ? '🤝 Investor' 
                              : item.role === 'employee' || item.role === 'karyawan' 
                              ? '🧑 Karyawan' 
                              : '❓ Other'}
                          </p>
                          {investor && <p className="text-xs text-gray-500">Terdaftar sebagai: {investor.name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingStakeholderId(item.id);
                            setStakeholderForm({
                              name: item.name,
                              role: item.role,
                              investor_id: item.investor_id || '',
                              notes: item.notes || '',
                              is_active: item.is_active,
                            });
                          }}>
                            <PencilLine className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (!confirm('Hapus stakeholder ini?')) return;
                            await fetch(`/api/stakeholders/${item.id}`, { method: 'DELETE' });
                            await fetchAllData();
                          }}>Hapus</Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Modal</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalFunding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Lunas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRepaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Sisa</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRemaining)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saldo per Investor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {investorBalances.map((inv, idx) => {
                const repaymentPercentage = (inv.totalRepaid / inv.initial_contribution) * 100;
                return (
                  <div key={inv.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">#{inv.priority_order || 999} {inv.name}</h3>
                        <p className="text-sm text-gray-600">{inv.repaymentCount} kali pembayaran</p>
                      </div>
                      <Badge variant={inv.remaining === 0 ? 'default' : 'outline'}>
                        {inv.remaining === 0 ? 'LUNAS' : `Sisa: ${formatCurrency(inv.remaining)}`}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Modal Masuk</p>
                        <p className="font-semibold">{formatCurrency(inv.totalCapital)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sudah Dibayar</p>
                        <p className="font-semibold text-green-600">{formatCurrency(inv.totalRepaid)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sisa</p>
                        <p className="font-semibold text-red-600">{formatCurrency(inv.remaining)}</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${Math.min(repaymentPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{repaymentPercentage.toFixed(1)}% lunas</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TAB 4: Pembayaran Kembali =====
  function Tab4Repayment() {
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
                <Label>Pilih Sumber Dana</Label>
                <Select value={formData.investor_id} onValueChange={(val: any) => setFormData({ ...formData, investor_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber dana untuk dikembalikan" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors
                      .filter((inv: any) => {
                        const invested = data.capitalEntries.filter((c: any) => c.investor_id === inv.id);
                        return invested.length > 0;
                      })
                      .sort((a, b) => (a.priority_order || 999) - (b.priority_order || 999))
                      .map((inv: any) => {
                        const sourceType = inv.source_type || 'investor';
                        const icon = sourceType === 'owner' ? '👤' : '🤝';
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {icon} {inv.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>

                {selectedInvestor && (
                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                    <p className="text-gray-700">
                      <span className="font-semibold">{selectedInvestor.name}</span>
                      {' • '}
                      <span className={selectedInvestor.source_type === 'owner' ? 'text-blue-600' : 'text-purple-600'}>
                        {selectedInvestor.source_type === 'owner' ? '👤 Owner' : '🤝 Investor'}
                      </span>
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Sisa hutang: <span className="font-semibold text-red-600">{formatCurrency(remaining)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jumlah Pembayaran (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formData.repayment_date}
                    onChange={(e) => setFormData({ ...formData, repayment_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Metode</Label>
                  <Select value={formData.method} onValueChange={(val: any) => setFormData({ ...formData, method: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
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

              <Button disabled={saving || !formData.investor_id} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran Kembali</CardTitle>
          </CardHeader>
          <CardContent>
            {data.repayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-4">
                {data.repayments.map((rep: any) => {
                  const investor = data.investors.find((inv: any) => inv.id === rep.investor_id);
                  return (
                    <div key={rep.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{investor?.name}</p>
                          <p className="text-sm text-gray-600">{formatDate(rep.repayment_date)} • {rep.method}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(rep.amount)}</p>
                          <button
                            onClick={async () => {
                              if (confirm('Hapus pembayaran ini?')) {
                                try {
                                  const response = await fetch(`/api/capital-repayments/${rep.id}`, { method: 'DELETE' });
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

  // ===== TAB 5: Summary Pendanaan =====
  function Tab5FundingSummary() {
    const totalCapital = data.capitalEntries.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
    const totalRepaid = data.repayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
    const totalRemaining = totalCapital - totalRepaid;

    const investorData = data.investors.map((inv: any) => {
      const invested = data.capitalEntries.filter((c: any) => c.investor_id === inv.id);
      const invested_amount = invested.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
      const repayments = data.repayments.filter((r: any) => r.investor_id === inv.id);
      const repaid_amount = repayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
      return {
        name: inv.name,
        value: invested_amount || inv.initial_contribution,
      };
    });

    const ownerData = data.capitalEntries
      .filter((c: any) => c.source_type === 'owner_personal')
      .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

    const chartData = [
      ...investorData.filter((d) => d.value > 0),
      ownerData > 0 ? { name: 'Owner Personal', value: ownerData } : null,
    ].filter(Boolean) as Array<{ name: string; value: number }>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Modal Masuk</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(totalCapital)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Pembayaran</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(totalRepaid)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-rose-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Sisa</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">{formatCurrency(totalRemaining)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Modal per Investor</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={75}
                    fill="#ea580c"
                    dataKey="value"
                    animationDuration={300}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">Tidak ada data modal</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan per Investor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.investors.map((inv: any) => {
                const invested = data.capitalEntries.filter((c: any) => c.investor_id === inv.id);
                const invested_amount = invested.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
                const repayments = data.repayments.filter((r: any) => r.investor_id === inv.id);
                const repaid_amount = repayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
                const remaining = invested_amount - repaid_amount;
                const repaymentPercent = invested_amount > 0 ? (repaid_amount / invested_amount) * 100 : 0;

                return (
                  <div key={inv.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-orange-200">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">⭐ Priority {inv.priority_order || 999} • {inv.name}</h3>
                      <Badge className={remaining === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-orange-100 text-orange-800 border-orange-300'}>
                        {remaining === 0 ? '✓ LUNAS' : `Sisa: ${formatCurrency(remaining)}`}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Investasi</p>
                        <p className="font-bold text-orange-600 mt-1">{formatCurrency(invested_amount || inv.initial_contribution)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lunas</p>
                        <p className="font-bold text-emerald-600 mt-1">{formatCurrency(repaid_amount)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-rose-50 to-rose-50/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sisa</p>
                        <p className="font-bold text-rose-600 mt-1">{formatCurrency(remaining)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${repaymentPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{repaymentPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}

              {ownerData > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-2">Owner Personal</h3>
                  <p className="text-sm">
                    Total Modal: <span className="font-semibold">{formatCurrency(ownerData)}</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TAB 6: Alokasi Laba Manual =====
  function Tab6ProfitAllocation() {
    const [formData, setFormData] = useState({
      allocation_date: new Date().toISOString().split('T')[0],
      period_label: '',
      net_profit: '',
      cash_reserve: '',
      notes: '',
    });
    const [allocationEntries, setAllocationEntries] = useState<Array<{ stakeholder_id: string; amount: string }>>([]);
    const [saving, setSaving] = useState(false);

    const netProfit = parseFloat(formData.net_profit || '0') || 0;
    const cashReserve = parseFloat(formData.cash_reserve || '0') || 0;
    const remainingForAllocation = Math.max(0, netProfit - cashReserve);
    
    const totalAllocated = allocationEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.amount || '0') || 0);
    }, 0);

    const allocationBalance = remainingForAllocation - totalAllocated;

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      if (!netProfit || netProfit <= 0) {
        alert('Laba bersih harus diisi dan lebih dari 0');
        return;
      }

      if (cashReserve < 0 || cashReserve > netProfit) {
        alert('Kas reserve tidak boleh negatif atau melebihi laba bersih');
        return;
      }

      if (totalAllocated > remainingForAllocation) {
        alert('Total alokasi melebihi sisa laba yang tersedia');
        return;
      }

      setSaving(true);
      try {
        // Build allocation notes from entries
        const allocationNotes = allocationEntries
          .filter(entry => entry.stakeholder_id && parseFloat(entry.amount || '0') > 0)
          .map(entry => {
            const stakeholder = data.stakeholders.find((s: any) => s.id === entry.stakeholder_id);
            return `${stakeholder?.name}: ${formatCurrency(parseFloat(entry.amount))}`;
          })
          .join(' | ');

        const response = await fetch('/api/profit-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            allocation_date: formData.allocation_date,
            period_label: formData.period_label,
            total_profit: netProfit,
            reserve_amount: cashReserve,
            distributed_amount: totalAllocated,
            allocation_mode: 'manual',
            notes: `Kas: ${formatCurrency(cashReserve)} | Alokasi: ${allocationNotes} | Catatan: ${formData.notes}`,
          }),
        });

        if (!response.ok) throw new Error('Failed to save profit allocation');

        setFormData({
          allocation_date: new Date().toISOString().split('T')[0],
          period_label: '',
          net_profit: '',
          cash_reserve: '',
          notes: '',
        });
        setAllocationEntries([]);
        await fetchAllData();
      } catch (error) {
        console.error('Error saving profit allocation:', error);
        alert('Error: ' + (error as any).message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Laba Bersih</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{formatCurrency(netProfit)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Kas Cadangan</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(cashReserve)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sisa untuk Alokasi</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(remainingForAllocation)}</p>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${allocationBalance >= 0 ? 'from-purple-50 to-white' : 'from-red-50 to-white'}`}>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Saldo Alokasi</p>
              <p className={`text-2xl font-bold mt-2 ${allocationBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {formatCurrency(allocationBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Catat Alokasi Laba Manual</CardTitle>
            <CardDescription>Masukkan laba bersih, kas, dan pembagian ke stakeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Period & Profit */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-3">1. Data Laba Bulan Ini</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <Label>Periode</Label>
                    <Input
                      value={formData.period_label}
                      onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                      placeholder="Contoh: 2026-06"
                    />
                  </div>
                  <div>
                    <Label>Tanggal Alokasi</Label>
                    <Input
                      type="date"
                      value={formData.allocation_date}
                      onChange={(e) => setFormData({ ...formData, allocation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Laba Bersih (Rp)*</Label>
                    <Input
                      type="number"
                      value={formData.net_profit}
                      onChange={(e) => setFormData({ ...formData, net_profit: e.target.value })}
                      placeholder="Contoh: 5000000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Cash Reserve */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-3">2. Kas Cadangan untuk Operasional</h3>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="max-w-xs">
                    <Label>Jumlah Kas (Rp)</Label>
                    <Input
                      type="number"
                      value={formData.cash_reserve}
                      onChange={(e) => setFormData({ ...formData, cash_reserve: e.target.value })}
                      placeholder="Contoh: 2000000"
                    />
                    <p className="text-xs text-emerald-700 mt-2">
                      💡 Sisa untuk alokasi: <strong>{formatCurrency(remainingForAllocation)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Manual Allocation */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-700">3. Bagikan Sisa ke Stakeholder</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${allocationBalance < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {allocationBalance < 0 ? '❌ Kelebihan' : '✓ Sisa'}: {formatCurrency(allocationBalance)}
                  </span>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  {data.stakeholders.length === 0 ? (
                    <p className="text-sm text-gray-600">Belum ada stakeholder terdaftar. Tambahkan di tab Stakeholder terlebih dahulu.</p>
                  ) : (
                    <>
                      {allocationEntries.map((entry, idx) => {
                        const stakeholder = data.stakeholders.find((s: any) => s.id === entry.stakeholder_id);
                        return (
                          <div key={idx} className="grid grid-cols-[2fr_1fr_40px] gap-3 items-end bg-white p-3 rounded border border-gray-200">
                            <div>
                              <Label className="text-xs">Pilih Stakeholder</Label>
                              <Select 
                                value={entry.stakeholder_id || ''} 
                                onValueChange={(val) => {
                                  const newEntries = [...allocationEntries];
                                  newEntries[idx].stakeholder_id = val || '';
                                  setAllocationEntries(newEntries);
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Pilih stakeholder" />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.stakeholders.map((st: any) => (
                                    <SelectItem key={st.id} value={st.id}>
                                      {st.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Nominal (Rp)</Label>
                              <Input
                                type="number"
                                value={entry.amount}
                                onChange={(e) => {
                                  const newEntries = [...allocationEntries];
                                  newEntries[idx].amount = e.target.value;
                                  setAllocationEntries(newEntries);
                                }}
                                placeholder="0"
                                className="h-9"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setAllocationEntries(allocationEntries.filter((_, i) => i !== idx))}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      
                      <button
                        type="button"
                        onClick={() => setAllocationEntries([...allocationEntries, { stakeholder_id: '', amount: '' }])}
                        className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 border border-dashed border-blue-300 rounded hover:bg-blue-100/50 transition"
                      >
                        + Tambah Penerima
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Section 4: Notes */}
              <div>
                <Label>Catatan Tambahan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan alokasi, misalnya: alasan pembagian, kondisi khusus, dll"
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-3 border-t">
                <Button 
                  type="submit" 
                  disabled={saving || netProfit <= 0 || allocationBalance < 0} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Alokasi'}
                </Button>
                {allocationBalance < 0 && (
                  <p className="text-sm text-red-600">⚠️ Total alokasi melebihi sisa laba</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Alokasi Laba</CardTitle>
          </CardHeader>
          <CardContent>
            {data.profitAllocations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada alokasi laba</p>
            ) : (
              <div className="space-y-3">
                {data.profitAllocations.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.period_label || formatDate(item.allocation_date)}</h3>
                        <p className="text-sm text-gray-600">{formatDate(item.allocation_date)}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Hapus alokasi laba ini?')) {
                            try {
                              const response = await fetch(`/api/profit-allocations/${item.id}`, { method: 'DELETE' });
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
                    <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-gray-600">Laba Bersih</p>
                        <p className="font-semibold text-orange-600">{formatCurrency(item.total_profit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kas Cadangan</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(item.reserve_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Dialokasikan</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(item.distributed_amount)}</p>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-600 mt-3 p-2 bg-gray-100 rounded">
                        📝 {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TAB 7: Kas Usaha =====
  function Tab7CashLedger() {
    const totalInflow = data.cashTransactions
      .filter((tx: any) => tx.transaction_type === 'inflow')
      .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || 0), 0);

    const totalOutflow = data.cashTransactions
      .filter((tx: any) => tx.transaction_type === 'outflow')
      .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount || 0), 0);

    const cashBalance = totalInflow - totalOutflow;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Masuk</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalInflow)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Keluar</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalOutflow)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Saldo Kas</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(cashBalance)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mutasi Kas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.cashTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada mutasi kas</p>
            ) : (
              <div className="space-y-3">
                {data.cashTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 border rounded-lg p-4">
                    <div>
                      <p className="font-semibold">{tx.description}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(tx.transaction_date)} • {tx.source_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.transaction_type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.transaction_type === 'inflow' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{tx.transaction_type}</p>
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

  if (data.loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">💳 Manajemen Pendanaan</h1>
        <p className="text-gray-600">Kelola modal, investor, dan pembayaran kembali</p>
      </div>

      {data.error && (
        <Alert className="bg-red-50 text-red-800 border-red-200">
          <strong>Error:</strong> {data.error}
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="role">👥 Role</TabsTrigger>
          <TabsTrigger value="modal">💰 Modal</TabsTrigger>
          <TabsTrigger value="balance">📊 Saldo</TabsTrigger>
          <TabsTrigger value="repayment">💳 Bayar Kembali</TabsTrigger>
          <TabsTrigger value="cash">🏦 Kas</TabsTrigger>
          <TabsTrigger value="allocation">📈 Alokasi Laba</TabsTrigger>
          <TabsTrigger value="summary">📋 Ringkasan</TabsTrigger>
        </TabsList>

        <TabsContent value="role">
          {Tab2InvestorProfilesComponent}
        </TabsContent>

        <TabsContent value="modal">
          <Tab1CapitalHistory />
        </TabsContent>

        <TabsContent value="balance">
          <Tab3InvestorBalance />
        </TabsContent>

        <TabsContent value="repayment">
          <Tab4Repayment />
        </TabsContent>

        <TabsContent value="cash">
          <Tab7CashLedger />
        </TabsContent>

        <TabsContent value="allocation">
          <Tab6ProfitAllocation />
        </TabsContent>

        <TabsContent value="summary">
          <Tab5FundingSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
