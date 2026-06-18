'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, Edit2, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { CapitalEntry, Investor, CapitalRepayment, ProfitAllocation, CashTransaction, DashboardMetrics } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useOutlet } from '@/lib/context/OutletContext';
import { CashBalanceDashboard } from '@/components/dashboard/CashBalanceDashboard';
import { ProfitAllocationHistory } from '@/components/tables/ProfitAllocationHistory';
import { ProfitAllocationApprovalModal } from '@/components/modals/ProfitAllocationApprovalModal';

interface FundingState {
  capitalEntries: Array<CapitalEntry & {
    edited_at?: string;
    original_date?: string | null;
    original_amount?: number | null;
    edit_reason?: string | null;
  }>;
  investors: Investor[];
  repayments: CapitalRepayment[];
  profitAllocations: Array<ProfitAllocation & {
    profit_pending_amount?: number;
    approval_status?: 'draft' | 'approved' | string;
  }>;
  cashTransactions: CashTransaction[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
}

type RoleSourceType = 'owner' | 'investor' | 'karyawan';
type AllocationType = 'gaji' | 'bonus' | 'thr' | 'bonus_produksi';

interface EmployeeRecord {
  id: string;
  name: string;
  role?: string;
}

interface InvestorHutangStatus {
  outstanding: number;
  status: 'lunas' | 'cicil' | 'belum' | 'full_payment';
  total_modal: number;
  total_repaid: number;
}

interface AllocationRecord {
  investorName: string;
  amount: number;
}

interface EmployeeAllocationRecord {
  allocation_amount: number;
  allocation_type: AllocationType;
}

interface AllocatedCicilanRecord {
  allocation_id: string;
  allocation_date: string;
  allocated_cicilan: number;
  available_for_payment: number;
  cicilan_info?: {
    capital_entry_id?: string;
  };
  cicilan_schedule_items?: Array<{
    cicilan_number: number;
    cicilan_amount: number;
    status: 'paid' | 'pending';
  }>;
}

interface AllocatedCicilanResponse {
  allocations?: AllocatedCicilanRecord[];
}

export default function FundingPage() {
  const { outletId } = useOutlet();
  const [activeTab, setActiveTab] = useState('kelola');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedAllocationForApproval, setSelectedAllocationForApproval] = useState<ProfitAllocation | null>(null);
  const [data, setData] = useState<FundingState>({
    capitalEntries: [],
    investors: [],
    repayments: [],
    profitAllocations: [],
    cashTransactions: [],
    metrics: null,
    loading: true,
    error: null,
  });
  const [roleEditingId, setRoleEditingId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    source_type: 'investor' as 'owner' | 'investor' | 'karyawan',
    name: '',
    phone: '',
    notes: '',
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [refreshBalance, setRefreshBalance] = useState(0);

  const fetchAllData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const [entries, investors, repayments, profitAllocations, cashTransactions, metricsRes] = await Promise.all([
        fetch(`/api/capital?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/investors?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/capital-repayments?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/profit-allocations?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/cash-transactions?outlet_id=${outletId}`).then(r => r.json()),
        fetch(`/api/dashboard?outlet_id=${outletId}`).then(r => r.json()),
      ]);

      setData({
        capitalEntries: Array.isArray(entries) ? entries : [],
        investors: Array.isArray(investors) ? investors : [],
        repayments: Array.isArray(repayments) ? repayments : [],
        profitAllocations: Array.isArray(profitAllocations) ? profitAllocations : [],
        cashTransactions: Array.isArray(cashTransactions) ? cashTransactions : [],
        metrics: metricsRes || null,
        loading: false,
        error: null,
      });
      
      // Trigger refresh cash balance dashboard
      setRefreshBalance(prev => prev + 1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat data';
      setData(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [outletId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAllData]);

  // Role Management Functions
  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      alert('Nama harus diisi');
      return;
    }

    setRoleSubmitting(true);
    try {
      const payload = {
        outlet_id: outletId,
        source_type: roleForm.source_type,
        name: roleForm.name,
        phone: roleForm.phone || null,
        notes: roleForm.notes || null,
        priority_order: roleEditingId ? undefined : data.investors.length + 1,
      };

      if (roleEditingId) {
        const res = await fetch('/api/investors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: roleEditingId, ...payload }),
        });
        if (!res.ok) throw new Error('Gagal update role');
      } else {
        const res = await fetch('/api/investors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal tambah role');
      }

      setRoleForm({ source_type: 'investor', name: '', phone: '', notes: '' });
      setRoleEditingId(null);
      await fetchAllData();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error saving role');
    } finally {
      setRoleSubmitting(false);
    }
  }

  async function handleRoleDelete(id: string) {
    if (!confirm('Hapus role ini?')) return;
    try {
      const res = await fetch(`/api/investors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      await fetchAllData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting role');
    }
  }

  async function handleApproveAllocation(allocationId: string, approvalNotes: string) {
    try {
      const res = await fetch(`/api/profit-allocations/${allocationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          approval_notes: approvalNotes,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Gagal approve alokasi');
      }
      setApprovalModalOpen(false);
      setSelectedAllocationForApproval(null);
      await fetchAllData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Approval error:', error);
      alert('Error approving allocation: ' + message);
    }
  }

  // TAB 0: Kelola Role
  function TabKelolaRole() {
    const roleIcon = {
      owner: '👤',
      investor: '🤝',
      karyawan: '🧑',
    };

    const roleLabel = {
      owner: 'Owner',
      investor: 'Investor',
      karyawan: 'Karyawan',
    };

    const ownerCount = data.investors.filter((r) => r.source_type === 'owner').length;
    const investorCount = data.investors.filter((r) => r.source_type === 'investor').length;
    const employeeCount = data.investors.filter((r) => r.source_type === 'karyawan').length;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Kelola Role</h2>
          <p className="text-gray-600">Atur owner, investor, dan karyawan yang akan menerima alokasi laba</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Total Role</p>
              <p className="text-2xl font-bold">{data.investors.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">👤 Owner</p>
              <p className="text-2xl font-bold text-blue-600">{ownerCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">🤝 Investor</p>
              <p className="text-2xl font-bold text-purple-600">{investorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">🧑 Karyawan</p>
              <p className="text-2xl font-bold text-green-600">{employeeCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{roleEditingId ? 'Edit Role' : 'Tambah Role Baru'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div>
                  <Label>Tipe Role*</Label>
                  <Select
                    value={roleForm.source_type}
                    onValueChange={(val: RoleSourceType | null) =>
                      setRoleForm({ ...roleForm, source_type: (val ?? 'investor') as RoleSourceType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">👤 Owner</SelectItem>
                      <SelectItem value="investor">🤝 Investor</SelectItem>
                      <SelectItem value="karyawan">🧑 Karyawan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nama*</Label>
                  <Input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="Nama owner/investor/karyawan"
                    required
                  />
                </div>

                <div>
                  <Label>Telepon (opsional)</Label>
                  <Input
                    value={roleForm.phone}
                    onChange={(e) => setRoleForm({ ...roleForm, phone: e.target.value })}
                    placeholder="08xx..."
                  />
                </div>

                <div>
                  <Label>Catatan (opsional)</Label>
                  <Textarea
                    value={roleForm.notes}
                    onChange={(e) => setRoleForm({ ...roleForm, notes: e.target.value })}
                    placeholder="Catatan tambahan"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={roleSubmitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {roleSubmitting ? 'Menyimpan...' : roleEditingId ? 'Update' : 'Simpan'}
                  </Button>
                  {roleEditingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRoleEditingId(null);
                        setRoleForm({ source_type: 'investor', name: '', phone: '', notes: '' });
                      }}
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            {data.loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : data.investors.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  Belum ada role. Tambahkan yang pertama!
                </CardContent>
              </Card>
            ) : (
              data.investors.map((role) => {
                const roleCapital = data.capitalEntries
                  .filter((c) => c.investor_id === role.id)
                  .reduce((sum: number, c) => sum + c.amount, 0);
                
                return (
                <Card key={role.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{roleIcon[role.source_type as keyof typeof roleIcon]}</span>
                          <div>
                            <h3 className="font-semibold text-lg">{role.name}</h3>
                            <p className="text-sm text-gray-600">{roleLabel[role.source_type as keyof typeof roleLabel]}</p>
                          </div>
                        </div>
                        {role.phone && (
                          <p className="text-sm text-gray-600">📞 {role.phone}</p>
                        )}
                        {role.notes && (
                          <p className="text-sm text-gray-600 italic mt-2">💬 {role.notes}</p>
                        )}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-semibold text-blue-600">💰 Total Modal: {formatCurrency(roleCapital)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRoleEditingId(role.id);
                            setRoleForm({
                              source_type: (role.source_type ?? 'investor') as RoleSourceType,
                              name: role.name,
                              phone: role.phone || '',
                              notes: role.notes || '',
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRoleDelete(role.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // TAB 1: Modal Masuk
  function TabModalMasuk() {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      source_id: '',
      notes: '',
      hutang_status: 'cicilan' as 'full_payment' | 'cicilan',
      cicilan_amount: '',
      cicilan_start_date: new Date().toISOString().split('T')[0],
      cicilan_months: '',
    });
    const [saving, setSaving] = useState(false);

    // Edit modal state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
      date: '',
      amount: '',
      notes: '',
      edit_reason: '',
    });
    const [editReason, setEditReason] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const selectedSource = data.investors.find((inv) => inv.id === formData.source_id);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!selectedSource) {
        alert('Pilih sumber dana terlebih dahulu');
        return;
      }

      // Validate cicilan fields if hutang_status is cicilan
      if (formData.hutang_status === 'cicilan' && !formData.cicilan_amount) {
        alert('Cicilan amount harus diisi jika status CICILAN');
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
            hutang_status: formData.hutang_status,
            cicilan_amount: formData.hutang_status === 'cicilan' ? parseFloat(formData.cicilan_amount) : null,
            cicilan_start_date: formData.hutang_status === 'cicilan' ? formData.cicilan_start_date : null,
            cicilan_months: formData.hutang_status === 'cicilan' ? parseInt(formData.cicilan_months) || null : null,
            hutang_status_set_by: 'dashboard'
          }),
        });
        if (!response.ok) throw new Error('Failed to create capital entry');
        setFormData({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          source_id: '',
          notes: '',
          hutang_status: 'cicilan',
          cicilan_amount: '',
          cicilan_start_date: new Date().toISOString().split('T')[0],
          cicilan_months: '',
        });
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
        alert('Error saving capital entry');
      } finally {
        setSaving(false);
      }
    }

    async function handleEditSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!editingId) return;
      if (!editForm.date || !editForm.amount) {
        alert('Tanggal dan jumlah harus diisi');
        return;
      }
      if (!editReason.trim()) {
        alert('Alasan edit harus diisi (contoh: kesalahan ketik)');
        return;
      }

      setEditSaving(true);
      try {
        const response = await fetch(`/api/capital/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: editForm.date,
            amount: parseFloat(editForm.amount),
            notes: editForm.notes,
            edit_reason: editReason,
          }),
        });
        if (!response.ok) throw new Error('Failed to update capital entry');
        
        setEditingId(null);
        setEditForm({ date: '', amount: '', notes: '', edit_reason: '' });
        setEditReason('');
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
        alert('Error updating capital entry');
      } finally {
        setEditSaving(false);
      }
    }

    async function handleDelete(id: string) {
      if (!confirm('Hapus entri modal ini? Tindakan ini tidak dapat dibatalkan.')) return;

      try {
        const response = await fetch(`/api/capital/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete capital entry');
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting capital entry');
      }
    }

    function openEditModal(entry: CapitalEntry) {
      setEditingId(entry.id);
      setEditForm({
        date: entry.date,
        amount: entry.amount.toString(),
        notes: entry.notes || '',
        edit_reason: '',
      });
      setEditReason('');
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
                <Label>Pilih Role (Owner/Investor/Karyawan)*</Label>
                <Select value={formData.source_id || ''} onValueChange={(val) => setFormData({ ...formData, source_id: val || '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role">
                      {formData.source_id && data.investors.find((inv) => inv.id === formData.source_id)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data.investors.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Belum ada role. Buat di halaman Kelola Role.</div>
                    ) : (
                      data.investors.map((inv) => {
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

              {selectedSource && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-gray-700">
                    <span className="font-semibold">{selectedSource.name}</span>
                    {' • '}
                    <span className={selectedSource.source_type === 'owner' ? 'text-blue-600' : selectedSource.source_type === 'karyawan' ? 'text-green-600' : 'text-purple-600'}>
                      {selectedSource.source_type === 'owner' ? '👤 Owner' : selectedSource.source_type === 'karyawan' ? '🧑 Karyawan' : '🤝 Investor'}
                    </span>
                  </p>
                  {selectedSource.phone && <p className="text-gray-600 text-xs mt-1">📞 {selectedSource.phone}</p>}
                  {selectedSource.notes && <p className="text-gray-600 text-xs mt-1">💬 {selectedSource.notes}</p>}
                </div>
              )}

              {/* HUTANG STATUS SECTION */}
              <div className="border-t pt-4">
                <Label className="font-semibold">💰 Tipe Pembayaran Hutang *</Label>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="full_payment"
                      name="hutang_status"
                      value="full_payment"
                      checked={formData.hutang_status === 'full_payment'}
                      onChange={(e) => setFormData({ ...formData, hutang_status: e.target.value as 'full_payment' | 'cicilan' })}
                      className="cursor-pointer"
                    />
                    <label htmlFor="full_payment" className="cursor-pointer text-sm">
                      💵 Full Payment (Bayar sekaligus)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="cicilan"
                      name="hutang_status"
                      value="cicilan"
                      checked={formData.hutang_status === 'cicilan'}
                      onChange={(e) => setFormData({ ...formData, hutang_status: e.target.value as 'full_payment' | 'cicilan' })}
                      className="cursor-pointer"
                    />
                    <label htmlFor="cicilan" className="cursor-pointer text-sm">
                      📅 Cicilan (Bayar berkala)
                    </label>
                  </div>
                </div>

                {/* Show cicilan fields if CICILAN selected */}
                {formData.hutang_status === 'cicilan' && (
                  <div className="space-y-4 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <Label>Cicilan Bulanan (Rp) *</Label>
                      <Input
                        type="number"
                        value={formData.cicilan_amount}
                        onChange={(e) => setFormData({ ...formData, cicilan_amount: e.target.value })}
                        placeholder="Jumlah cicilan per bulan"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Total modal: Rp {parseFloat(formData.amount).toLocaleString('id-ID') || '0'}</p>
                    </div>

                    <div>
                      <Label>Mulai Cicilan</Label>
                      <Input
                        type="date"
                        value={formData.cicilan_start_date}
                        onChange={(e) => setFormData({ ...formData, cicilan_start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Total Bulan Cicilan (opsional)</Label>
                      <Input
                        type="number"
                        value={formData.cicilan_months}
                        onChange={(e) => setFormData({ ...formData, cicilan_months: e.target.value })}
                        placeholder="Contoh: 12 bulan"
                        min="1"
                      />
                    </div>

                    <div className="text-xs bg-white p-2 rounded border border-yellow-200">
                      <p className="font-semibold text-yellow-800">💡 Catatan Cicilan:</p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
                        <li>Cicilan bersifat rencana, bisa disesuaikan saat Alokasi Laba</li>
                        <li>Hutang akan muncul di Step 2 Alokasi Laba dengan status CICIL</li>
                        <li>Repayment akan tercatat di tabel capital_repayments</li>
                      </ul>
                    </div>
                  </div>
                )}

                {formData.hutang_status === 'full_payment' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ Modal ini akan ditandai sebagai FULL PAYMENT. Tidak akan muncul di Alokasi Laba.
                    </p>
                  </div>
                )}
              </div>

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
            <CardDescription>Klik Edit untuk mengubah atau hapus entri</CardDescription>
          </CardHeader>
          <CardContent>
            {data.capitalEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada modal masuk</p>
            ) : (
              <div className="space-y-3">
                {data.capitalEntries.map((entry) => {
                  const sourceType = entry.source_type || 'investor';
                  const icon = sourceType === 'owner' ? '👤' : sourceType === 'karyawan' ? '🧑' : '🤝';
                  const label = sourceType === 'owner' ? 'Owner' : sourceType === 'karyawan' ? 'Karyawan' : 'Investor';
                  
                  return (
                    <div key={entry.id} className={`p-4 border rounded-lg ${entry.edited_at ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{icon}</span>
                            <span className="font-semibold">{entry.source || '-'}</span>
                            <Badge variant={sourceType === 'investor' ? 'default' : 'secondary'}>
                              {label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-gray-600">Tanggal</p>
                              <p className="font-semibold">{formatDate(entry.date)}</p>
                              {entry.original_date && (
                                <p className="text-xs text-gray-500">Sebelumnya: {formatDate(entry.original_date)}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600">Jumlah</p>
                              <p className="font-semibold">{formatCurrency(entry.amount)}</p>
                              {entry.original_amount && (
                                <p className="text-xs text-gray-500">Sebelumnya: {formatCurrency(entry.original_amount)}</p>
                              )}
                            </div>
                          </div>

                          {entry.notes && (
                            <div className="text-sm mb-2">
                              <p className="text-gray-600">Catatan</p>
                              <p className="text-gray-700">{entry.notes}</p>
                            </div>
                          )}

                          {entry.edited_at && (
                            <div className="text-xs p-2 bg-amber-100 rounded border border-amber-200 mt-2">
                              <p className="font-semibold text-amber-800">✏️ Diedit</p>
                              <p className="text-amber-700">{formatDate(entry.edited_at)}</p>
                              {entry.edit_reason && (
                                <p className="text-amber-700 mt-1">
                                  <span className="font-semibold">Alasan:</span> {entry.edit_reason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(entry)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Modal Masuk</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tanggal</Label>
                      <Input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Jumlah (Rp)</Label>
                      <Input
                        type="number"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Catatan</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Catatan tambahan (opsional)"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Alasan Edit* (contoh: kesalahan ketik, typo)</Label>
                    <Input
                      type="text"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Jelaskan mengapa di-edit..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ini akan dicatat dalam audit trail untuk transparansi
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={editSaving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // TAB 2: Alokasi Laba
  // ========== TAB 2: ALOKASI LABA v2.0 - NEW DESIGN WITH HUTANG PRIORITY ==========
  function TabAllokasiLaba() {
    // ===== STATES =====
    const [step, setStep] = useState<number>(1); // Step tracker (1-8, 2.5=employee allocation)
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Step 1: Load balances
    const [profitPending, setProfitPending] = useState(0);
    const [kasUtama, setKasUtama] = useState(0);
    const [simpanUang, setSimpanUang] = useState(0);

    // Step 2-3: Hutang calculation
    const [investorHutang, setInvestorHutang] = useState<Record<string, InvestorHutangStatus>>({});
    const [totalHutang, setTotalHutang] = useState(0);
    const [hutangWarning, setHutangWarning] = useState(false);

    // Step 4: Auto-deduct
    const [profitAfterHutang, setProfitAfterHutang] = useState(0);
    const [hutangAllocations, setHutangAllocations] = useState<Record<string, AllocationRecord>>({});

    // Step 2.5: Employee allocation (NEW - Phase 3)
    const [employeeMode, setEmployeeMode] = useState<'exclude' | 'include'>('exclude');
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [employeeAllocations, setEmployeeAllocations] = useState<Record<string, EmployeeAllocationRecord>>({});
    const [totalEmployeeAllocation, setTotalEmployeeAllocation] = useState(0);
    const [profitAfterEmployee, setProfitAfterEmployee] = useState(0);

    // Step 5: User choice
    const [userChoice, setUserChoice] = useState<'full_profit' | 'available_kas' | 'custom'>('full_profit');
    const [availableForAllocation, setAvailableForAllocation] = useState(0);

    // Step 6: Kas Utama top-up
    const [kasTopup, setKasTopup] = useState('');
    const [useKasTopup, setUseKasTopup] = useState(false);

    // Step 7: Simpan Uang
    const [simpanAmount, setSimpanAmount] = useState('');
    const [simpanReason, setSimpanReason] = useState('');

    // Step 8: Profit share

    async function loadAllocationData() {
      setLoading(true);
      try {
        // Load financial balances
        const balanceRes = await fetch(`/api/cash/financial-summary?outlet_id=${outletId}`);
        if (!balanceRes.ok) throw new Error('Failed to load balances');
        const balance = await balanceRes.json();

        setProfitPending(balance.profit_pending || 0);
        setKasUtama(balance.kas_utama || 0);
        setSimpanUang(balance.simpan_uang || 0);
        setProfitAfterHutang(balance.profit_pending || 0);

        // Calculate hutang per investor
        const hutangMap: Record<string, InvestorHutangStatus> = {};
        let totalHutangAmount = 0;

        console.log('[DEBUG] data.investors:', data.investors);
        
        for (const investor of data.investors) {
          try {
            console.log(`[DEBUG] Fetching hutang for ${investor.name} (${investor.id})`);
            const hutangRes = await fetch(`/api/investors/${investor.id}?hutang-status=true`);
            if (hutangRes.ok) {
              const hutang = await hutangRes.json();
              console.log(`[DEBUG] Hutang response for ${investor.id}:`, hutang);
              hutangMap[investor.id] = hutang;
              if (hutang.status === 'cicil') {
                totalHutangAmount += hutang.outstanding;
              }
            } else {
              console.warn(`[DEBUG] Hutang API returned error status ${hutangRes.status} for ${investor.id}`);
            }
          } catch (err) {
            console.warn('[DEBUG] Could not fetch hutang for investor:', investor.id, err);
          }
        }

        console.log('[DEBUG] Final hutangMap:', hutangMap);
        console.log('[DEBUG] Final totalHutangAmount:', totalHutangAmount);
        
        setInvestorHutang(hutangMap);
        setTotalHutang(totalHutangAmount);

        // WARN if profit_pending < total hutang
        if (balance.profit_pending < totalHutangAmount) {
          setHutangWarning(true);
        }

        // Fetch employees (NEW - Phase 3)
        try {
          const empRes = await fetch(`/api/employees?outlet_id=${outletId}&status=active`);
          if (empRes.ok) {
            const empData = await empRes.json();
            setEmployees(empData.employees || []);
          }
        } catch (err) {
          console.warn('Could not fetch employees:', err);
        }

        setStep(2);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Load data error:', error);
        alert('Error loading allocation data: ' + message);
      } finally {
        setLoading(false);
      }
    }

    // ===== STEP 1: Load balances and hutang data =====
    useEffect(() => {
      if (step === 1) {
        void loadAllocationData();
      }
    }, [step]);

    // ===== STEP 4: Auto-deduct hutang =====
    function autoDeductHutang() {
      const allocations: Record<string, { investorName: string; amount: number }> = {};
      let remainingProfit = profitPending;

      // Prioritas: bayar hutang investor CICIL dulu
      for (const investor of data.investors) {
        const hutang = investorHutang[investor.id];
        if (hutang && hutang.status === 'cicil') {
          const toPay = Math.min(hutang.outstanding, remainingProfit);
          if (toPay > 0) {
            allocations[investor.id] = { investorName: investor.name, amount: toPay };
            remainingProfit -= toPay;
          }
        }
      }

      setHutangAllocations(allocations);
      setProfitAfterHutang(remainingProfit);
      setStep(2.5); // NEW: Go to employee allocation step
    }

    // ===== STEP 5: Handle user choice =====
    function handleUserChoice(choice: 'full_profit' | 'available_kas' | 'custom') {
      setUserChoice(choice);
      
      // Calculate available for allocation
      let available = profitAfterHutang;
      if (choice === 'available_kas') {
        available = Math.min(profitAfterHutang, kasUtama);
      }
      
      setAvailableForAllocation(available);
      setStep(6);
    }

    // ===== STEP 6: Kas top-up =====
    function handleKasTopup() {
      const topup = parseFloat(kasTopup) || 0;
      const BUFFER_KAS = 100000;
      if (topup < 0) {
        alert('Invalid kas top-up amount');
        return;
      }
      if (useKasTopup) {
        if (topup > kasUtama - BUFFER_KAS) {
          alert(`Kas utama tidak mencukupi setelah buffer Rp ${BUFFER_KAS.toLocaleString('id-ID')}`);
          return;
        }
      } else {
        if (topup > profitAfterHutang) {
          alert('Invalid kas top-up amount (cannot exceed available profit)');
          return;
        }
      }
      setStep(7);
    }

    // ===== STEP 7: Simpan Uang =====
    function handleSimpanAllocation() {
      const amount = parseFloat(simpanAmount) || 0;
      if (amount < 0 || amount > profitAfterHutang) {
        alert('Invalid simpan amount');
        return;
      }
      if (amount > 0 && !simpanReason.trim()) {
        alert('Masukkan alasan Simpan Uang');
        return;
      }
      setStep(8);
    }

    // ===== STEP 8: Profit share =====
    async function calculateAndSaveAllocation() {
      setSaving(true);
      try {
        const month = new Date().toISOString().substring(0, 7); // YYYY-MM

        // Convert employee allocations to array format
        const employeeAllocArray = (Object.entries(employeeAllocations) as Array<[string, EmployeeAllocationRecord]>).map(
          ([empId, alloc]) => ({
            employee_id: empId,
            allocation_amount: alloc.allocation_amount,
            allocation_type: alloc.allocation_type,
          })
        );

        // Build allocation record
        const allocationRecord = {
          outlet_id: outletId,
          allocation_month: month,
          allocation_date: new Date().toISOString().split('T')[0],
          
          // Hutang payments (auto)
          hutang_payments: hutangAllocations,
          total_hutang_paid: Object.values(hutangAllocations).reduce((sum, h) => sum + h.amount, 0),
          
          // Employee allocation (NEW - Phase 3)
          employee_mode: employeeMode,
          employee_allocations: employeeAllocArray,
          
          // Kas top-up
          kas_utama_topup: parseFloat(kasTopup) || 0,
          use_kas_utama_topup: useKasTopup || false,
          
          // Simpan Uang
          simpan_uang_amount: parseFloat(simpanAmount) || 0,
          simpan_reason: simpanReason || null,
          
          // Profit available
          profit_pending_amount: profitPending,
          profit_after_hutang: profitAfterHutang,
          user_choice: userChoice,
          
          // Tracking
          notes: `Phase 3.0: Hutang + Karyawan allocation with ${data.investors.length} investors and ${employeeAllocArray.length} employees`,
        };

        const response = await fetch('/api/profit-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allocationRecord),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save allocation');
        }

        // Success
        alert('✅ Alokasi laba Phase 3 berhasil disimpan (Hutang + Karyawan)!');
        await fetchAllData();
        setStep(1);
        
        // Reset forms
        setEmployeeMode('exclude');
        setEmployeeAllocations({});
        setTotalEmployeeAllocation(0);
        setKasTopup('');
        setSimpanAmount('');
        setSimpanReason('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Save error:', error);
        alert('❌ Error: ' + message);
      } finally {
        setSaving(false);
      }
    }

    // ===== RENDER =====
    return (
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  s <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s <= step - 1 ? '✓' : s}
              </div>
              {s < 8 && <div className={`w-2 h-0.5 ${s < step ? 'bg-blue-600' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Load Data */}
        {step === 1 && (
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Step 1: Loading Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">Sedang memuat Profit Pending dan status hutang investor...</p>
              <Button onClick={loadAllocationData} disabled={loading} className="bg-blue-600">
                {loading ? 'Loading...' : 'Load Data'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Show Balances & Hutang Warning */}
        {step >= 2 && (
          <Card className={hutangWarning ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {hutangWarning ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" /> Step 2-3: ⚠️ Hutang Check
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" /> Step 2-3: ✅ Hutang Status
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Profit Pending</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(profitPending)}</p>
                  <p className="text-xs text-gray-500 mt-1">Tersedia untuk alokasi</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Kas Utama</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(kasUtama)}</p>
                  <p className="text-xs text-gray-500 mt-1">Operasional saat ini</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Simpan Uang</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(simpanUang)}</p>
                  <p className="text-xs text-gray-500 mt-1">Strategis fund</p>
                </div>
                <div className="p-3 bg-white rounded border border-red-300">
                  <p className="text-xs text-red-600 font-semibold">Total Hutang</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalHutang)}</p>
                  <p className="text-xs text-gray-500 mt-1">CICIL investors</p>
                </div>
              </div>

              {hutangWarning && (
                <div className="p-4 bg-red-100 border border-red-400 rounded">
                  <p className="text-sm font-semibold text-red-700">
                    ⚠️ WARNING: Profit pending ({formatCurrency(profitPending)}) KURANG dari total hutang ({formatCurrency(totalHutang)})!
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Shortfall: {formatCurrency(totalHutang - profitPending)}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3 text-sm">Hutang Status per Investor:</h3>
                <div className="space-y-2">
                  {data.investors.map((investor) => {
                    const hutang = investorHutang[investor.id];
                    if (!hutang) return null;
                    
                    const icon = hutang.status === 'lunas' ? '✅' : hutang.status === 'cicil' ? '⚠️' : '❌';
                    const color = hutang.status === 'lunas' ? 'text-green-600' : hutang.status === 'cicil' ? 'text-orange-600' : 'text-red-600';
                    
                    return (
                      <div key={investor.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                        <span>
                          {icon} {investor.name}
                        </span>
                        <span className={`font-semibold ${color}`}>{hutang.status.toUpperCase()}</span>
                        {hutang.outstanding > 0 && (
                          <span className="text-gray-600">{formatCurrency(hutang.outstanding)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {step === 2 && (
                <Button onClick={() => setStep(3)} className="w-full bg-blue-600">
                  Lanjut ke Step 3: Auto-Deduct Hutang
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Confirm Auto-Deduct */}
        {step === 3 && (
          <Card className="border-purple-300 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Step 3: Auto-Deduct Hutang
              </CardTitle>
              <CardDescription>
                Sistem akan otomatis mengurangi Profit Pending untuk pembayaran hutang CICIL investors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded border-2 border-purple-300">
                <p className="text-sm font-semibold mb-3">Logika: Profit Pending akan digunakan untuk:</p>
                <ol className="space-y-2 text-sm">
                  <li><span className="font-semibold">1.</span> Bayar hutang investor CICIL (prioritas utama)</li>
                  <li><span className="font-semibold">2.</span> Top-up Kas Utama untuk operasional bulan depan</li>
                  <li><span className="font-semibold">3.</span> Alokasi Simpan Uang (strategic fund)</li>
                  <li><span className="font-semibold">4.</span> Profit share ke investor LUNAS (sisa)</li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded border">
                <p className="text-xs text-gray-600 mb-2">Profit Pending:</p>
                <p className="text-2xl font-bold text-blue-600 mb-4">{formatCurrency(profitPending)}</p>
                <p className="text-xs text-gray-600">Akan dikurangi untuk bayar hutang sebesar:</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalHutang)}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                  Kembali
                </Button>
                <Button onClick={autoDeductHutang} className="flex-1 bg-purple-600">
                  Lanjut: Auto-Deduct
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2.5: Alokasi Karyawan (NEW - Phase 3) */}
        {step === 2.5 && (
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" /> Step 2.5: Alokasi Karyawan
              </CardTitle>
              <CardDescription>
                Pilih apakah ingin mengalokasikan profit ke karyawan untuk gaji/bonus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Mode Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="emp_exclude"
                    checked={employeeMode === 'exclude'}
                    onChange={() => {
                      setEmployeeMode('exclude');
                      setEmployeeAllocations({});
                      setTotalEmployeeAllocation(0);
                    }}
                    className="w-5 h-5"
                  />
                  <label htmlFor="emp_exclude" className="cursor-pointer flex-1">
                    <span className="font-semibold">Tidak ada alokasi ke karyawan</span>
                    <p className="text-sm text-gray-600">Skip langkah ini, lanjut ke tahap berikutnya</p>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="emp_include"
                    checked={employeeMode === 'include'}
                    onChange={() => setEmployeeMode('include')}
                    className="w-5 h-5 mt-1"
                  />
                  <label htmlFor="emp_include" className="cursor-pointer flex-1">
                    <span className="font-semibold">✓ Alokasikan ke karyawan</span>
                    <p className="text-sm text-gray-600">Pilih karyawan dan tentukan alokasi gaji/bonus</p>
                  </label>
                </div>
              </div>

              {/* Employee Allocation Form */}
              {employeeMode === 'include' && (
                <div className="bg-white p-4 rounded border-2 border-green-300">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">Tidak ada karyawan aktif</p>
                  ) : (
                    <div className="space-y-4">
                      {employees.map((emp) => (
                        <div key={emp.id} className="p-3 bg-gray-50 rounded border">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-sm">{emp.name}</p>
                              <p className="text-xs text-gray-600">{emp.role}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-semibold block mb-1">Alokasi (Rp)</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={employeeAllocations[emp.id]?.allocation_amount || ''}
                                onChange={(e) => {
                                  const amount = parseInt(e.target.value) || 0;
                                  setEmployeeAllocations((prev) => ({
                                    ...prev,
                                    [emp.id]: {
                                      ...prev[emp.id],
                                      allocation_amount: amount,
                                      allocation_type: prev[emp.id]?.allocation_type || 'gaji',
                                    },
                                  }));
                                }}
                                className="text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold block mb-1">Tipe Alokasi</label>
                              <Select
                                value={employeeAllocations[emp.id]?.allocation_type || 'gaji'}
                                onValueChange={(value: AllocationType | null) => {
                                  setEmployeeAllocations((prev) => ({
                                    ...prev,
                                    [emp.id]: {
                                      ...prev[emp.id],
                                      allocation_amount: prev[emp.id]?.allocation_amount || 0,
                                      allocation_type: (value ?? 'gaji') as AllocationType,
                                    },
                                  }));
                                }}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gaji">Gaji Bulanan</SelectItem>
                                  <SelectItem value="bonus">Bonus</SelectItem>
                                  <SelectItem value="thr">THR</SelectItem>
                                  <SelectItem value="bonus_produksi">Bonus Produksi</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Employee Allocation Summary */}
                  {Object.keys(employeeAllocations).length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">Total Alokasi Karyawan:</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(
                            Object.values(employeeAllocations).reduce(
                              (sum: number, alloc) => sum + (alloc.allocation_amount || 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Akan dikurangi dari sisa profit setelah pembayaran hutang
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-2">
                <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                  Kembali
                </Button>
                <Button
                  onClick={() => {
                    // Calculate total employee allocation
                    const total = Object.values(employeeAllocations).reduce(
                      (sum: number, alloc) => sum + (alloc.allocation_amount || 0),
                      0
                    );
                    setTotalEmployeeAllocation(total);
                    setProfitAfterEmployee(profitAfterHutang - total);
                    setStep(4);
                  }}
                  className="flex-1 bg-blue-600"
                >
                  Lanjut ke Step 4: Tinjau Alokasi
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Show After-Hutang Amount */}
        {step >= 4 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-600" /> Step 4: Hutang Sudah Dikurangi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Profit Awal</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(profitPending)}</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Bayar Hutang</p>
                  <p className="text-lg font-bold text-red-600">- {formatCurrency(totalHutang)}</p>
                </div>
              </div>

              {/* Show employee allocation if any */}
              {totalEmployeeAllocation > 0 && (
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-600">Alokasi Karyawan</p>
                  <p className="text-lg font-bold text-purple-600">- {formatCurrency(totalEmployeeAllocation)}</p>
                </div>
              )}

              <div className="p-3 bg-white rounded border border-green-400">
                <p className="text-xs text-gray-600 font-semibold">Sisa Profit Untuk Alokasi</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(profitAfterEmployee || profitAfterHutang)}</p>
              </div>

              {Object.keys(hutangAllocations).length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Hutang yang dibayar:</h3>
                  <div className="space-y-1">
                    {Object.entries(hutangAllocations).map(([invId, alloc]) => (
                      <div key={invId} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span>{alloc.investorName}</span>
                        <span className="font-semibold text-red-600">{formatCurrency(alloc.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show employee allocations if any */}
              {Object.keys(employeeAllocations).length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Alokasi Karyawan:</h3>
                  <div className="space-y-1">
                    {Object.entries(employeeAllocations).map(([empId, alloc]) => {
                      const employee = employees.find((e) => e.id === empId);
                      return (
                        <div key={empId} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span>{employee?.name}</span>
                          <span className="font-semibold text-purple-600">
                            {alloc.allocation_type} : {formatCurrency(alloc.allocation_amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <Button onClick={() => setStep(5)} className="w-full bg-blue-600">
                  Lanjut ke Step 5: User Choice
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5: User Choice */}
        {step >= 5 && (
          <Card className="border-indigo-300 bg-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Step 5: Pilih Strategi Alokasi
              </CardTitle>
              <CardDescription>
                Bagaimana cara mengalokasikan sisa profit {formatCurrency(profitAfterHutang)}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div
                  onClick={() => handleUserChoice('full_profit')}
                  className={`p-4 rounded border-2 cursor-pointer transition ${
                    userChoice === 'full_profit'
                      ? 'border-indigo-600 bg-white'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={userChoice === 'full_profit'}
                      onChange={() => handleUserChoice('full_profit')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-semibold">💰 Full Profit Allocation</p>
                      <p className="text-sm text-gray-600">Alokasikan seluruh sisa profit {formatCurrency(profitAfterHutang)}</p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleUserChoice('available_kas')}
                  className={`p-4 rounded border-2 cursor-pointer transition ${
                    userChoice === 'available_kas'
                      ? 'border-indigo-600 bg-white'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={userChoice === 'available_kas'}
                      onChange={() => handleUserChoice('available_kas')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-semibold">🛡️ Limited to Available Kas</p>
                      <p className="text-sm text-gray-600">
                        Alokasikan hanya sebatas Kas Utama yang tersedia ({formatCurrency(Math.min(profitAfterHutang, kasUtama))})
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleUserChoice('custom')}
                  className={`p-4 rounded border-2 cursor-pointer transition ${
                    userChoice === 'custom'
                      ? 'border-indigo-600 bg-white'
                      : 'border-gray-300 bg-gray-50 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={userChoice === 'custom'}
                      onChange={() => handleUserChoice('custom')}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-semibold">⚙️ Custom Amount</p>
                      <p className="text-sm text-gray-600">Tentukan jumlah alokasi sendiri</p>
                    </div>
                  </div>
                </div>
              </div>

              {step === 5 && (
                <Button onClick={() => setStep(6)} className="w-full bg-indigo-600">
                  Lanjut ke Step 6: Top-up Kas Utama
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 6: Kas Utama Top-up */}
        {step >= 6 && (
          <Card className="border-green-300 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Step 6: Top-up Kas Utama
              </CardTitle>
              <CardDescription>
                Berapa nominal top-up untuk operasional bulan depan? (dari sisa profit)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Sisa Profit untuk Top-up:</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(availableForAllocation)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={useKasTopup} onChange={(e) => setUseKasTopup(e.target.checked)} className="w-4 h-4" />
                  <div>
                    <p className="font-semibold">Gunakan Kas Utama untuk menutup kekurangan (Opsi B)</p>
                    <p className="text-xs text-gray-500">Jika dipilih, kas utama akan digunakan untuk menutup shortfall hingga buffer aman.</p>
                  </div>
                </div>

                <div className="text-xs text-gray-600">Catatan buffer: sisakan minimal Rp {formatCurrency(100000)} di Kas Utama</div>

              <div>
                <Label>Nominal Top-up Kas Utama (Rp)</Label>
                <Input
                  type="number"
                  value={kasTopup}
                  onChange={(e) => setKasTopup(e.target.value)}
                  placeholder="0"
                  max={availableForAllocation}
                  disabled={step > 6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maks: {formatCurrency(availableForAllocation)}
                </p>
              </div>

              </div>

              {step === 6 && (
                <div className="flex gap-2">
                  <Button onClick={() => setStep(5)} variant="outline" className="flex-1">
                    Kembali
                  </Button>
                  <Button onClick={handleKasTopup} className="flex-1 bg-green-600">
                    Lanjut ke Step 7: Simpan Uang
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 7: Simpan Uang Allocation */}
        {step >= 7 && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Step 7: Alokasi Simpan Uang
              </CardTitle>
              <CardDescription>
                Alokasikan dana strategis (untuk investasi, darurat, dll) dengan alasan jelas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Tersedia setelah top-up kas:</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    availableForAllocation - (parseFloat(kasTopup) || 0)
                  )}
                </p>
              </div>

              <div>
                <Label>Nominal Simpan Uang (Rp)</Label>
                <Input
                  type="number"
                  value={simpanAmount}
                  onChange={(e) => setSimpanAmount(e.target.value)}
                  placeholder="0"
                  max={availableForAllocation - (parseFloat(kasTopup) || 0)}
                  disabled={step > 7}
                />
              </div>

              <div>
                <Label>Alasan Simpan Uang</Label>
                <Select value={simpanReason || ''} onValueChange={(val) => setSimpanReason(val || '')} disabled={step > 7}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency_fund">Dana Darurat</SelectItem>
                    <SelectItem value="expansion">Ekspansi / Investasi</SelectItem>
                    <SelectItem value="reserve">Cadangan Operasional</SelectItem>
                    <SelectItem value="seasonal">Persiapan Musiman</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {simpanReason === 'custom' && (
                <div>
                  <Label>Jelaskan Alasan</Label>
                  <Textarea
                    value={simpanReason}
                    onChange={(e) => setSimpanReason(e.target.value)}
                    placeholder="Jelaskan alasan simpan uang..."
                    disabled={step > 7}
                  />
                </div>
              )}

              {step === 7 && (
                <div className="flex gap-2">
                  <Button onClick={() => setStep(6)} variant="outline" className="flex-1">
                    Kembali
                  </Button>
                  <Button onClick={handleSimpanAllocation} className="flex-1 bg-yellow-600">
                    Lanjut ke Step 8: Hitung Profit Share
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 8: Summary & Save */}
        {step >= 8 && (
          <Card className="border-blue-400 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" /> Step 8: Review & Simpan
              </CardTitle>
              <CardDescription>Tinjau ringkasan alokasi laba sebelum menyimpan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary sections */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">📊 Ringkasan Alokasi:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm bg-white p-2 rounded">
                    <span>Profit Pending Awal</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(profitPending)}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-white p-2 rounded">
                    <span>Dikurangi: Bayar Hutang</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(totalHutang)}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-white p-2 rounded">
                    <span>Dikurangi: Kas Top-up</span>
                    <span className="font-semibold">- {formatCurrency(parseFloat(kasTopup) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-white p-2 rounded">
                    <span>Dikurangi: Simpan Uang</span>
                    <span className="font-semibold">- {formatCurrency(parseFloat(simpanAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-white p-2 rounded border-t-2 border-purple-300 mt-2">
                    <span className="font-semibold">SISA untuk Profit Share:</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(
                        profitPending -
                          totalHutang -
                          (parseFloat(kasTopup) || 0) -
                          (parseFloat(simpanAmount) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hutang allocations */}
              {Object.keys(hutangAllocations).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">💳 Pembayaran Hutang:</h3>
                  <div className="space-y-1">
                    {Object.entries(hutangAllocations).map(([invId, alloc]) => (
                      <div key={invId} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span>{alloc.investorName}</span>
                        <span className="font-semibold text-red-600">{formatCurrency(alloc.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => setStep(7)} variant="outline" className="flex-1">
                  Kembali
                </Button>
                <Button
                  onClick={calculateAndSaveAllocation}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Menyimpan...' : 'Simpan Alokasi Laba'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // TAB 3: Pembayaran Kembali (Phase 4 - Enhanced dengan Alokasi Laba tracking)
  function TabRepayment() {
    const [formData, setFormData] = useState({
      investor_id: '',
      amount: '',
      repayment_date: new Date().toISOString().split('T')[0],
      method: 'cash',
      notes: '',
      repayment_type: 'lunas' as 'lunas' | 'cicil',
      remaining_modal: '',
      // Phase 4 fields
      profit_allocation_id: '',
      cicilan_number: undefined as number | undefined,
      capital_entry_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [allocatedData, setAllocatedData] = useState<AllocatedCicilanResponse | null>(null);
    const [loadingAllocated, setLoadingAllocated] = useState(false);

    // Fetch allocated cicilan when investor changes
    useEffect(() => {
      if (formData.investor_id) {
        setLoadingAllocated(true);
        fetch(`/api/capital-repayments/allocated?investor_id=${formData.investor_id}&outlet_id=${outletId}`)
          .then(r => r.json())
          .then(data => setAllocatedData(data))
          .catch(err => console.error('Error fetching allocated:', err))
          .finally(() => setLoadingAllocated(false));
      } else {
        setAllocatedData(null);
      }
    }, [formData.investor_id]);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      // VALIDATION: If cicil, require remaining_modal
      if (formData.repayment_type === 'cicil' && !formData.remaining_modal) {
        alert('Sisa modal harus diisi untuk pembayaran cicil');
        return;
      }

      setSaving(true);
      try {
        const response = await fetch('/api/capital-repayments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            amount: parseFloat(formData.amount),
            remaining_modal: formData.repayment_type === 'cicil' ? parseFloat(formData.remaining_modal) : null,
            // Phase 4 fields
            profit_allocation_id: formData.profit_allocation_id || null,
            cicilan_number: formData.cicilan_number || null,
            capital_entry_id: formData.capital_entry_id || null,
          }),
        });
        if (!response.ok) throw new Error('Failed to create repayment');
        setFormData({
          investor_id: '',
          amount: '',
          repayment_date: new Date().toISOString().split('T')[0],
          method: 'cash',
          notes: '',
          repayment_type: 'lunas',
          remaining_modal: '',
          profit_allocation_id: '',
          cicilan_number: undefined,
          capital_entry_id: '',
        });
        setAllocatedData(null);
        await fetchAllData();
      } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan pembayaran');
      } finally {
        setSaving(false);
      }
    }

    const selectedInvestor = data.investors.find((inv) => inv.id === formData.investor_id);
    const investorCapital = data.capitalEntries
      .filter((c) => c.investor_id === formData.investor_id)
      .reduce((sum: number, c) => sum + parseFloat(String(c.amount || 0)), 0);
    const investorRepayments = data.repayments.filter((r) => r.investor_id === formData.investor_id);
    const totalRepaid = investorRepayments.reduce((sum: number, r) => sum + parseFloat(String(r.amount || 0)), 0);
    const remaining = investorCapital - totalRepaid;

    // Smart guidance: Check if lunas is possible
    const repaymentAmount = parseFloat(formData.amount) || 0;
    const isLunasAllowed = repaymentAmount > 0 && repaymentAmount >= remaining && remaining > 0;
    const isCisilAllowed = repaymentAmount > 0 && repaymentAmount < remaining;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Pembayaran Kembali Modal</CardTitle>
            <CardDescription>📋 Phase 4 - Tercatat otomatis ke repayment_tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>📥 Investor/Owner dengan Modal Masuk *</Label>
                <Select value={formData.investor_id || ''} onValueChange={(val) => setFormData({ ...formData, investor_id: val || '', profit_allocation_id: '', cicilan_number: undefined, capital_entry_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih investor/owner yang sudah input modal">
                      {formData.investor_id && (() => {
                        const inv = data.investors.find((i) => i.id === formData.investor_id);
                        const cap = data.capitalEntries
                          .filter((c) => c.investor_id === formData.investor_id)
                          .reduce((sum: number, c) => sum + parseFloat(String(c.amount || 0)), 0);
                        const icon = inv?.source_type === 'owner' ? '👤' : inv?.source_type === 'karyawan' ? '🧑' : '🤝';
                        return `${icon} ${inv?.name} (Modal: Rp ${cap.toLocaleString('id-ID')})`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const investorsWithCapital = data.investors.filter((inv) => {
                        const cap = data.capitalEntries.filter((c) => c.investor_id === inv.id);
                        return cap.length > 0;
                      });

                      if (investorsWithCapital.length === 0) {
                        return (
                          <div className="p-3 text-sm text-gray-500">
                            Belum ada investor/owner yang input modal. Silahkan input modal di Tab &quot;📥 Modal Masuk&quot; terlebih dahulu.
                          </div>
                        );
                      }

                      return investorsWithCapital.map((inv) => {
                        const cap = data.capitalEntries
                          .filter((c) => c.investor_id === inv.id)
                          .reduce((sum: number, c) => sum + parseFloat(String(c.amount || 0)), 0);
                        const icon = inv.source_type === 'owner' ? '👤' : inv.source_type === 'karyawan' ? '🧑' : '🤝';
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {icon} {inv.name} - Modal: Rp {cap.toLocaleString('id-ID')}
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">💡 Hanya menampilkan yang sudah input modal. Jika kosong, input modal dulu di Tab &quot;Modal Masuk&quot;.</p>
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

              {/* Phase 4: Show Allocated Cicilan */}
              {allocatedData?.allocations && allocatedData.allocations.length > 0 && (
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                  <p className="font-semibold text-sm mb-2">✅ Alokasi Cicilan Tersedia (dari Alokasi Laba)</p>
                  <div className="space-y-2">
                    {allocatedData.allocations.map((alloc) => (
                      <div key={alloc.allocation_id} className="border rounded p-2 bg-white">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="allocation"
                            value={alloc.allocation_id}
                            checked={formData.profit_allocation_id === alloc.allocation_id}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                profit_allocation_id: e.target.value,
                                capital_entry_id: alloc.cicilan_info?.capital_entry_id || '',
                              });
                            }}
                          />
                          <span className="text-sm font-semibold">
                            {alloc.allocation_date} • {formatCurrency(alloc.allocated_cicilan)}
                          </span>
                          <Badge variant={(Number(alloc.available_for_payment) || 0) > 0 ? 'default' : 'secondary'}>
                            Tersedia: {formatCurrency(alloc.available_for_payment)}
                          </Badge>
                        </div>
                        {alloc.cicilan_schedule_items && alloc.cicilan_schedule_items.length > 0 && (
                          <div className="ml-6 text-xs text-gray-600">
                            {alloc.cicilan_schedule_items.map((cs, idx: number) => (
                              <div key={idx} className="flex gap-2">
                                <span>Cicilan {cs.cicilan_number}:</span>
                                <span className={cs.status === 'paid' ? 'line-through text-green-600' : 'text-orange-600'}>
                                  {formatCurrency(cs.cicilan_amount)}
                                </span>
                                <Badge variant="outline" className="text-xs">{cs.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-700 mt-2">💡 Pilih alokasi untuk membayar dari alokasi laba investor</p>
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
                  <Label>Jumlah (Rp) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Smart Guidance for Repayment Type */}
              {repaymentAmount > 0 && remaining > 0 && (
                <div className={`p-3 rounded text-sm ${isLunasAllowed ? 'bg-green-50 border border-green-200' : isCisilAllowed ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className="font-semibold mb-1">💡 Panduan Pembayaran:</p>
                  {isLunasAllowed && (
                    <p className="text-green-700">✓ Pembayaran lunasnya terasa sudah cukup atau melebihi sisa modal. Kamu bisa pilih <strong>Lunas</strong> untuk menyelesaikan sekaligus.</p>
                  )}
                  {isCisilAllowed && (
                    <p className="text-yellow-700">⚠️ Pembayaran kurang dari sisa modal. Kamu harus pilih <strong>Cicil</strong> dan catat sisa yang masih pending.</p>
                  )}
                  {!isLunasAllowed && !isCisilAllowed && (
                    <p className="text-gray-600">Masukkan jumlah pembayaran yang valid.</p>
                  )}
                </div>
              )}

              {/* Repayment Type Selection */}
              <div>
                <Label>Jenis Pembayaran *</Label>
                <Select value={formData.repayment_type} onValueChange={(val) => setFormData({ ...formData, repayment_type: val as 'lunas' | 'cicil', remaining_modal: '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunas">
                      💰 Lunas (Selesai) - Pembayaran penuh modal kembali
                    </SelectItem>
                    <SelectItem value="cicil">
                      📊 Cicil (Bertahap) - Pembayaran sebagian, masih ada cicilan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remaining Modal Field (only for cicil) */}
              {formData.repayment_type === 'cicil' && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <Label>Sisa Modal yang Masih Cicil (Rp) *</Label>
                  <Input
                    type="number"
                    value={formData.remaining_modal}
                    onChange={(e) => setFormData({ ...formData, remaining_modal: e.target.value })}
                    placeholder="Contoh: 500000"
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-yellow-700 mt-2">
                    📝 Catat jumlah sisa modal yang akan dibayar di kemudian hari. Contoh: Pembayaran sekarang Rp 250rb, sisa Rp 250rb &rarr; masukkan &quot;250000&quot;
                  </p>
                </div>
              )}

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

              <Button type="submit" disabled={saving || loadingAllocated} className="w-full bg-orange-600 hover:bg-orange-700">
                {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {data.repayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-3">
                {data.repayments.map((rep) => {
                  const inv = data.investors.find((i) => i.id === rep.investor_id);
                  const icon = inv?.source_type === 'owner' ? '👤' : inv?.source_type === 'karyawan' ? '🧑' : '🤝';
                  const label = inv?.source_type === 'owner' ? 'Owner' : inv?.source_type === 'karyawan' ? 'Karyawan' : 'Investor';
                  const typeIcon = rep.repayment_type === 'lunas' ? '💰' : '📊';
                  const typeLabel = rep.repayment_type === 'lunas' ? 'Lunas' : 'Cicil';
                  return (
                    <div key={rep.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-semibold">
                            <span className="mr-2">{icon}</span>
                            {inv?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">{label} • {formatDate(rep.repayment_date)}</p>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(rep.amount)}</p>
                      </div>
                      <div className="flex gap-2 items-center text-xs mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-600">{typeIcon} {typeLabel}</span>
                        {rep.repayment_type === 'cicil' && rep.remaining_modal && (
                          <span className="text-orange-600">• Sisa: {formatCurrency(rep.remaining_modal)}</span>
                        )}
                        {rep.notes && (
                          <span className="text-gray-600 italic">• {rep.notes}</span>
                        )}
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Pendanaan</h1>
        <p className="text-gray-600">Kelola modal, alokasi laba, dan pembayaran</p>
      </div>

      {/* Cash Balance Dashboard - Real-time status kas */}
      <CashBalanceDashboard outletId={outletId} refreshTrigger={refreshBalance} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="kelola">🧑 Kelola Role</TabsTrigger>
          <TabsTrigger value="modal">📥 Modal Masuk</TabsTrigger>
          <TabsTrigger value="alokasi">💰 Alokasi Laba</TabsTrigger>
          <TabsTrigger value="repayment">📤 Pembayaran</TabsTrigger>
          <TabsTrigger value="riwayat">📋 Riwayat Alokasi</TabsTrigger>
        </TabsList>

        <TabsContent value="kelola" className="space-y-4">
          {/* eslint-disable-next-line react-hooks/static-components */}
          {<TabKelolaRole />}
        </TabsContent>

        <TabsContent value="modal" className="space-y-4">
          {/* eslint-disable-next-line react-hooks/static-components */}
          {<TabModalMasuk />}
        </TabsContent>

        <TabsContent value="alokasi" className="space-y-4">
          {/* eslint-disable-next-line react-hooks/static-components */}
          {<TabAllokasiLaba />}
        </TabsContent>

        <TabsContent value="repayment" className="space-y-4">
          {/* eslint-disable-next-line react-hooks/static-components */}
          {<TabRepayment />}
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">📋 Riwayat Alokasi Laba</h2>
              <p className="text-gray-600">Lihat history alokasi laba dan kelola approval workflow</p>
            </div>

            {data.loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600">Total Alokasi</p>
                      <p className="text-2xl font-bold text-blue-600">{data.profitAllocations.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600">Total Profit</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          data.profitAllocations.reduce(
                            (sum: number, a) => sum + (parseFloat(String(a.profit_pending_amount ?? 0)) || 0),
                            0
                          )
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600">Draft</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {data.profitAllocations.filter((a) => a.approval_status === 'draft').length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-green-600">
                        {data.profitAllocations.filter((a) => a.approval_status === 'approved').length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* History Component */}
                <ProfitAllocationHistory
                  allocations={data.profitAllocations as ProfitAllocation[]}
                  onApprove={(allocation) => {
                    setSelectedAllocationForApproval(allocation as ProfitAllocation);
                    setApprovalModalOpen(true);
                  }}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval Modal */}
      <ProfitAllocationApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        allocation={selectedAllocationForApproval}
        onApprove={handleApproveAllocation}
      />
    </div>
  );
}
