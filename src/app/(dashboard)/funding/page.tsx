'use client';

import { useState, useEffect } from 'react';
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
import StakeholderModal from '@/components/modals/StakeholderModal';
import RuleModal from '@/components/modals/RuleModal';
import { CapitalEntry, Investor, CapitalRepayment, ProfitAllocation, CashTransaction, Stakeholder, AllocationRule } from '@/types';
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
  allocationRules: AllocationRule[];
  loading: boolean;
  error: string | null;
}

const COLORS = ['#ea580c', '#fb923c', '#fed7aa', '#fecaca', '#86efac'];

export default function FundingPage() {
  const { outletId } = useOutlet();
  const [activeTab, setActiveTab] = useState('modal');
  const [data, setData] = useState<FundingState>({
    capitalEntries: [],
    investors: [],
    repayments: [],
    profitAllocations: [],
    cashTransactions: [],
    stakeholders: [],
    allocationRules: [],
    loading: true,
    error: null,
  });

  // Modal & stakeholder/rule state (top-level, shared across tabs)
  const [openStakeholderModal, setOpenStakeholderModal] = useState(false);
  const [openRuleModal, setOpenRuleModal] = useState(false);
  const [editingStakeholderId, setEditingStakeholderId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    role: 'founder',
    investor_id: '',
    default_share_percent: '',
    notes: '',
    is_active: true,
  });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    recover_first: true,
    cash_reserve_percent: '10',
    allow_overdraft: false,
    notes: '',
  });

  useEffect(() => {
    fetchAllData();
  }, [outletId]);

  async function fetchAllData() {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [entries, investors, repayments, profitAllocations, cashTransactions, stakeholders, allocationRules] = await Promise.all([
        fetch(`/api/capital?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/investors?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/capital-repayments?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/profit-allocations?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/cash-transactions?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/stakeholders?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/allocation-rules?outlet_id=${outletId}`).then(r => r.json()),
      ]);

      setData({
        capitalEntries: Array.isArray(entries) ? entries : [],
        investors: Array.isArray(investors) ? investors : [],
        repayments: Array.isArray(repayments) ? repayments : [],
        profitAllocations: Array.isArray(profitAllocations) ? profitAllocations : [],
        cashTransactions: Array.isArray(cashTransactions) ? cashTransactions : [],
        stakeholders: Array.isArray(stakeholders) ? stakeholders : [],
        allocationRules: Array.isArray(allocationRules) ? allocationRules : [],
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  async function submitStakeholder() {
    try {
      const body = {
        outlet_id: outletId,
        name: stakeholderForm.name,
        role: stakeholderForm.role,
        investor_id: stakeholderForm.investor_id || null,
        default_share_percent: stakeholderForm.default_share_percent || 0,
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
        role: 'founder',
        investor_id: '',
        default_share_percent: '',
        notes: '',
        is_active: true,
      });
      setEditingStakeholderId(null);
      setOpenStakeholderModal(false);
      await fetchAllData();
    } catch (error) {
      console.error('Stakeholder save error:', error);
      alert('Error saving stakeholder');
    }
  }

  async function submitRule() {
    try {
      const body = {
        outlet_id: outletId,
        name: ruleForm.name,
        recover_first: ruleForm.recover_first,
        cash_reserve_percent: parseFloat(ruleForm.cash_reserve_percent),
        allow_overdraft: ruleForm.allow_overdraft,
        notes: ruleForm.notes || '',
      };

      const response = editingRuleId
        ? await fetch(`/api/allocation-rules/${editingRuleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/allocation-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (!response.ok) throw new Error('Gagal simpan rule');

      setRuleForm({
        name: '',
        recover_first: true,
        cash_reserve_percent: '10',
        allow_overdraft: false,
        notes: '',
      });
      setEditingRuleId(null);
      setOpenRuleModal(false);
      await fetchAllData();
    } catch (error) {
      console.error('Rule save error:', error);
      alert('Error saving rule');
    }
  }

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

              <Button disabled={saving || !selectedSource} className="bg-orange-600 hover:bg-orange-700 w-full">
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

  // ===== TAB 2: Info Sumber Dana =====
  function Tab2InvestorProfiles() {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ Kelola Sumber Dana di Halaman Terpisah</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-900">
            <p className="mb-4">
              Untuk menambah, mengubah, atau menghapus sumber dana (owner atau investor), silakan buka halaman <strong>Sumber Dana</strong> di menu navigasi.
            </p>
            <p className="text-sm mb-4">
              Di halaman tersebut Anda dapat:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 mb-4">
              <li>Membedakan antara owner (internal) dan investor (eksternal)</li>
              <li>Mencatat nama, nomor telepon, dan jumlah modal</li>
              <li>Menambahkan catatan untuk setiap sumber dana</li>
              <li>Melihat progres pengembalian modal untuk setiap sumber</li>
            </ul>
            <Button 
              onClick={() => window.location.href = '/investors'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Buka Halaman Sumber Dana →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Sumber Dana Terdaftar</CardTitle>
            <CardDescription>Sumber dana yang sudah input di halaman Sumber Dana</CardDescription>
          </CardHeader>
          <CardContent>
            {data.investors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada sumber dana. Buat di halaman Sumber Dana.</p>
            ) : (
              <div className="grid gap-4">
                {data.investors.map((inv: any) => {
                  const sourceType = inv.source_type || 'investor';
                  const icon = sourceType === 'owner' ? '👤' : '🤝';
                  const investedTotal = data.capitalEntries
                    .filter((c: any) => c.investor_id === inv.id)
                    .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
                  
                  return (
                    <div key={inv.id} className="border rounded-lg p-4 hover:border-orange-300 hover:bg-orange-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{icon} {inv.name}</h3>
                            <Badge variant={sourceType === 'owner' ? 'default' : 'secondary'}>
                              {sourceType === 'owner' ? 'Owner' : 'Investor'}
                            </Badge>
                          </div>
                          {inv.phone && <p className="text-sm text-gray-600">{inv.phone}</p>}
                          {inv.notes && <p className="text-sm text-gray-600 italic">Catatan: {inv.notes}</p>}
                        </div>
                        <Badge variant={inv.status === 'active' ? 'default' : 'outline'}>
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="text-sm grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-gray-600">Modal Awal</p>
                          <p className="font-semibold">{formatCurrency(inv.initial_contribution)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Sudah Diinvestasi</p>
                          <p className="font-semibold">{formatCurrency(investedTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Sisa</p>
                          <p className="font-semibold text-orange-600">{formatCurrency(inv.remaining_balance)}</p>
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

  // ===== TAB 3: Saldo Investor =====
  function Tab3InvestorBalance() {
    const investorBalances = data.investors
      .map((inv: any) => {
        const investorRepayments = data.repayments.filter((r: any) => r.investor_id === inv.id);
        const totalRepaid = investorRepayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
        return {
          ...inv,
          totalRepaid,
          remaining: inv.initial_contribution - totalRepaid,
          repaymentCount: investorRepayments.length,
        };
      })
      .sort((a, b) => (a.priority_order || 999) - (b.priority_order || 999));

    const totalFunding = data.investors.reduce((sum: number, inv: any) => sum + parseFloat(inv.initial_contribution || 0), 0);
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
                setStakeholderForm({ name: '', role: 'founder', investor_id: '', default_share_percent: '', notes: '', is_active: true });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Baru
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama</Label>
                  <Input value={stakeholderForm.name} onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })} placeholder="Founder A" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={stakeholderForm.role} onValueChange={(val: any) => setStakeholderForm({ ...stakeholderForm, role: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="founder">Founder</SelectItem>
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Share %</Label>
                  <Input type="number" value={stakeholderForm.default_share_percent} onChange={(e) => setStakeholderForm({ ...stakeholderForm, default_share_percent: e.target.value })} placeholder="60" />
                </div>
                <div>
                  <Label>Investor (opsional)</Label>
                  <Select value={stakeholderForm.investor_id} onValueChange={(val: any) => setStakeholderForm({ ...stakeholderForm, investor_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih investor (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">- Tidak ada -</SelectItem>
                      {data.investors.map((inv: any) => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                          <p className="text-xs text-gray-500 capitalize">{item.role} • {item.default_share_percent}%</p>
                          {investor && <p className="text-xs text-gray-500">Investor: {investor.name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingStakeholderId(item.id);
                            setStakeholderForm({
                              name: item.name,
                              role: item.role,
                              investor_id: item.investor_id || '',
                              default_share_percent: String(item.default_share_percent ?? 0),
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rule Alokasi</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingRuleId(null);
                setRuleForm({ name: '', recover_first: true, cash_reserve_percent: '10', allow_overdraft: false, notes: '' });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Baru
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Rule</Label>
                  <Input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Default rule" />
                </div>
                <div>
                  <Label>Kas Reserve %</Label>
                  <Input type="number" value={ruleForm.cash_reserve_percent} onChange={(e) => setRuleForm({ ...ruleForm, cash_reserve_percent: e.target.value })} placeholder="10" />
                </div>
                <div>
                  <Label>Balik Modal Dulu</Label>
                  <Select value={ruleForm.recover_first ? 'yes' : 'no'} onValueChange={(val) => setRuleForm({ ...ruleForm, recover_first: val === 'yes' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Ya</SelectItem>
                      <SelectItem value="no">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Allow Overdraft</Label>
                  <Select value={ruleForm.allow_overdraft ? 'yes' : 'no'} onValueChange={(val) => setRuleForm({ ...ruleForm, allow_overdraft: val === 'yes' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Ya</SelectItem>
                      <SelectItem value="no">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={submitRule} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-1" /> {editingRuleId ? 'Update' : 'Simpan'}
                </Button>
                {editingRuleId && (
                  <Button type="button" variant="outline" onClick={() => setEditingRuleId(null)}>Batal edit</Button>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {data.allocationRules.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada rule</p>
                ) : (
                  data.allocationRules.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name || 'Default rule'}</p>
                        <p className="text-xs text-gray-500">Recover: {item.recover_first ? 'Ya' : 'Tidak'} • Reserve: {item.cash_reserve_percent}% • Overdraft: {item.allow_overdraft ? 'Ya' : 'Tidak'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedRuleId(item.id);
                          setEditingRuleId(item.id);
                          setRuleForm({
                            name: item.name || '',
                            recover_first: item.recover_first,
                            cash_reserve_percent: String(item.cash_reserve_percent ?? 10),
                            allow_overdraft: item.allow_overdraft,
                            notes: item.notes || '',
                          });
                        }}>
                          <PencilLine className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm('Hapus rule ini?')) return;
                          await fetch(`/api/allocation-rules/${item.id}`, { method: 'DELETE' });
                          if (selectedRuleId === item.id) setSelectedRuleId(null);
                          await fetchAllData();
                        }}>Hapus</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pilih Rule untuk Preview / Eksekusi</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedRuleId || ''} onValueChange={(val: any) => setSelectedRuleId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rule" />
              </SelectTrigger>
              <SelectContent>
                {data.allocationRules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>{rule.name || 'Default rule'} ({rule.cash_reserve_percent}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">Rule ini dipakai saat preview dan eksekusi alokasi laba.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
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
                        <p className="text-gray-600">Dipinjam</p>
                        <p className="font-semibold">{formatCurrency(inv.initial_contribution)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sudah Lunas</p>
                        <p className="font-semibold text-green-600">{formatCurrency(inv.totalRepaid)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Sisa Hutang</p>
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
    const investorRepayments = data.repayments.filter((r: any) => r.investor_id === formData.investor_id);
    const totalRepaid = investorRepayments.reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
    const remaining = selectedInvestor ? selectedInvestor.initial_contribution - totalRepaid : 0;

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

  // ===== TAB 6: Alokasi Laba =====
  function Tab6ProfitAllocation() {
    const [formData, setFormData] = useState({
      allocation_date: new Date().toISOString().split('T')[0],
      period_label: '',
      total_profit: '',
      reserve_amount: '',
      distributed_amount: '',
      allocation_mode: 'retain',
      reserve_label: 'Kas muter / cadangan',
      distribution_label: 'Bagi hasil',
      notes: '',
    });
    const [saving, setSaving] = useState(false);

    const totalReserved = data.profitAllocations.reduce((sum: number, item: any) => sum + parseFloat(item.reserve_amount || 0), 0);
    const totalDistributed = data.profitAllocations.reduce((sum: number, item: any) => sum + parseFloat(item.distributed_amount || 0), 0);
    const totalAllocated = data.profitAllocations.reduce((sum: number, item: any) => sum + parseFloat(item.total_profit || 0), 0);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      const totalProfit = parseFloat(formData.total_profit);
      const reserveAmount = parseFloat(formData.reserve_amount || '0');
      const distributedAmount = formData.distributed_amount
        ? parseFloat(formData.distributed_amount)
        : Math.max(0, totalProfit - reserveAmount);

      if (!totalProfit || totalProfit <= 0) {
        alert('Total laba harus diisi dan lebih dari 0');
        return;
      }

      if (reserveAmount + distributedAmount > totalProfit) {
        alert('Total reserve + dibagi tidak boleh melebihi total laba');
        return;
      }

      setSaving(true);
      try {
        const response = await fetch('/api/profit-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outlet_id: outletId,
            allocation_date: formData.allocation_date,
            period_label: formData.period_label,
            total_profit: totalProfit,
            reserve_amount: reserveAmount,
            distributed_amount: distributedAmount,
            allocation_mode: formData.allocation_mode,
            reserve_label: formData.reserve_label,
            distribution_label: formData.distribution_label,
            notes: formData.notes,
          }),
        });

        if (!response.ok) throw new Error('Failed to save profit allocation');

        setFormData({
          allocation_date: new Date().toISOString().split('T')[0],
          period_label: '',
          total_profit: '',
          reserve_amount: '',
          distributed_amount: '',
          allocation_mode: 'retain',
          reserve_label: 'Kas muter / cadangan',
          distribution_label: 'Bagi hasil',
          notes: '',
        });

        await fetchAllData();
        setPreview(null);
      } catch (error) {
        console.error('Error saving profit allocation:', error);
      } finally {
        setSaving(false);
      }
    }

    // TODO: Fix infinite loop - useEffect structure needs refactor
    // useEffect(() => {
    //   if ((data.allocationRules || []).length > 0 && !selectedRuleId) {
    //     setSelectedRuleId((data.allocationRules || [])[0].id);
    //   }
    // }, [data.allocationRules.length, selectedRuleId]);

    // useEffect(() => {
    //   const selectedRule = data.allocationRules.find((rule) => rule.id === selectedRuleId);
    //   if (selectedRule) {
    //     setRuleForm({
    //       name: selectedRule.name || '',
    //       recover_first: selectedRule.recover_first,
    //       cash_reserve_percent: String(selectedRule.cash_reserve_percent ?? 10),
    //       allow_overdraft: selectedRule.allow_overdraft,
    //       notes: selectedRule.notes || '',
    //     });
    //   }
    // }, [selectedRuleId, data.allocationRules]);

    async function handlePreview() {
      try {
        const month = new Date(formData.allocation_date).getMonth() + 1;
        const year = new Date(formData.allocation_date).getFullYear();
        const res = await fetch('/api/allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outlet_id: outletId, month, year, rule_id: selectedRuleId, dry_run: true }),
        });
        const json = await res.json();
        if (json.preview) setPreview(json.preview);
        else alert('Preview gagal');
      } catch (err) {
        console.error('Preview error', err);
        alert('Gagal generate preview');
      }
    }

    async function handleExecute() {
      if (!confirm('Eksekusi alokasi akan membuat entri mutasi kas. Lanjutkan?')) return;
      try {
        const month = new Date(formData.allocation_date).getMonth() + 1;
        const year = new Date(formData.allocation_date).getFullYear();
        const res = await fetch('/api/allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outlet_id: outletId, month, year, rule_id: selectedRuleId, dry_run: false, run_by: 'system' }),
        });
        const json = await res.json();
        if (json.result) {
          alert('Alokasi berhasil dieksekusi');
          await fetchAllData();
          setPreview(null);
        } else {
          alert('Eksekusi gagal: ' + (json.error || 'unknown'));
        }
      } catch (err) {
        console.error('Execute error', err);
        alert('Gagal eksekusi alokasi');
      }
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Alokasi</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAllocated)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Kas Muter / Cadangan</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReserved)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Dibagikan</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDistributed)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catat Alokasi Laba Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Periode</Label>
                  <Input
                    value={formData.period_label}
                    onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                    placeholder="Contoh: 2026-05"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Total Laba Bulan Ini (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.total_profit}
                    onChange={(e) => setFormData({ ...formData, total_profit: e.target.value })}
                    placeholder="Contoh: 5000000"
                    required
                  />
                </div>
                <div>
                  <Label>Masuk Kas / Cadangan (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.reserve_amount}
                    onChange={(e) => setFormData({ ...formData, reserve_amount: e.target.value })}
                    placeholder="Contoh: 3000000"
                  />
                </div>
                <div>
                  <Label>Dibagikan (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.distributed_amount}
                    onChange={(e) => setFormData({ ...formData, distributed_amount: e.target.value })}
                    placeholder="Kosongkan kalau mau auto hitung"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mode Alokasi</Label>
                  <Select value={formData.allocation_mode} onValueChange={(val: any) => setFormData({ ...formData, allocation_mode: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retain">Tahan Semua</SelectItem>
                      <SelectItem value="split">Bagi Sebagian</SelectItem>
                      <SelectItem value="full_distribution">Bagi Semua</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Label Cadangan</Label>
                  <Input
                    value={formData.reserve_label}
                    onChange={(e) => setFormData({ ...formData, reserve_label: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Label Distribusi</Label>
                <Input
                  value={formData.distribution_label}
                  onChange={(e) => setFormData({ ...formData, distribution_label: e.target.value })}
                />
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: bulan ini 60% ditahan untuk kas muter, 40% dibagi founder"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handlePreview} className="bg-sky-600 hover:bg-sky-700">Preview (Dry-run)</Button>
                <Button disabled={saving} onClick={handleExecute} className="bg-orange-600 hover:bg-orange-700">{saving ? 'Menyimpan...' : 'Eksekusi Alokasi'}</Button>
                <Button disabled={saving} onClick={handleSubmit} variant="outline">Simpan Manual</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Alokasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="font-semibold text-lg">{formatCurrency(preview.total_profit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kas Muter</p>
                  <p className="font-semibold text-lg">{formatCurrency(preview.reserve_amount)}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold mb-2">Distribusi per Stakeholder</h4>
                {preview.allocations && preview.allocations.length > 0 ? (
                  <div className="space-y-2">
                    {preview.allocations.map((a: any) => (
                      <div key={a.stakeholder_id} className="flex justify-between">
                        <div>{a.name} <span className="text-sm text-gray-500">({a.percent}%)</span></div>
                        <div className="font-semibold">{formatCurrency(a.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada stakeholder terdaftar</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold">{item.period_label || formatDate(item.allocation_date)}</h3>
                        <p className="text-sm text-gray-600">Mode: {item.allocation_mode}</p>
                        <p className="text-sm text-gray-600">{item.notes || '-'}</p>
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
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Total Laba</p>
                        <p className="font-semibold">{formatCurrency(item.total_profit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kas Muter</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(item.reserve_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Dibagikan</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(item.distributed_amount)}</p>
                      </div>
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

      {/* Modals for stakeholder & rule management (modal components handle their own state) */}
      <StakeholderModal
        open={openStakeholderModal}
        onOpenChange={setOpenStakeholderModal}
        initial={editingStakeholderId ? data.stakeholders.find(s => s.id === editingStakeholderId) : undefined}
        onSave={async () => {
          await submitStakeholder();
        }}
      />

      <RuleModal
        open={openRuleModal}
        onOpenChange={setOpenRuleModal}
        initial={editingRuleId ? data.allocationRules.find(r => r.id === editingRuleId) : undefined}
        onSave={async () => {
          await submitRule();
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="modal">Modal</TabsTrigger>
          <TabsTrigger value="investors">Sumber Dana</TabsTrigger>
          <TabsTrigger value="balance">Saldo</TabsTrigger>
          <TabsTrigger value="repayment">Pembayaran</TabsTrigger>
          <TabsTrigger value="cash">Kas</TabsTrigger>
          <TabsTrigger value="allocation">Alokasi Laba</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="modal">
          <Tab1CapitalHistory />
        </TabsContent>

        <TabsContent value="investors">
          <Tab2InvestorProfiles />
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
