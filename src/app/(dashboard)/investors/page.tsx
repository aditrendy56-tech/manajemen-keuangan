'use client'

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Investor } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';
import { Trash2, PencilLine } from 'lucide-react';

export default function FundingSourcePage() {
  const { outletId } = useOutlet();
  const [sources, setSources] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    source_type: 'investor' as 'owner' | 'investor' | 'karyawan',
    name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    loadSources();
  }, [outletId]);

  const loadSources = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/investors?outlet_id=${outletId}`);
      if (!res.ok) throw new Error('Failed to load sources');
      const data = await res.json();
      setSources(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      
      const payload = {
        outlet_id: outletId,
        source_type: formData.source_type,
        name: formData.name,
        phone: formData.phone || null,
        initial_contribution: 0,
        notes: formData.notes || null,
        priority_order: editingId ? undefined : sources.length + 1
      };

      if (editingId) {
        const res = await fetch('/api/investors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });
        if (!res.ok) throw new Error('Failed to update source');
      } else {
        const res = await fetch('/api/investors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to add source');
      }
      
      setFormData({
        source_type: 'investor',
        name: '',
        phone: '',
        notes: ''
      });
      setEditingId(null);
      await loadSources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus sumber dana ini?')) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/investors/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete source');
      await loadSources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (source: Investor) => {
    setFormData({
      source_type: (source.source_type || 'investor') as 'owner' | 'investor' | 'karyawan',
      name: source.name,
      phone: source.phone || '',
      notes: source.notes || ''
    });
    setEditingId(source.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalByType = (type: 'owner' | 'investor') => {
    return sources
      .filter(s => (s.source_type || 'investor') === type)
      .reduce((sum, s) => sum + (s.initial_contribution || 0), 0);
  };

  const ownerTotal = getTotalByType('owner');
  const investorTotal = getTotalByType('investor');
  const grandTotal = ownerTotal + investorTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kelola Role</h1>
        <p className="mt-2 text-gray-600">Daftar owner, investor, dan karyawan untuk alokasi pembagian laba</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{sources.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sources.filter(s => (s.source_type || 'investor') === 'owner').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Investor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{sources.filter(s => (s.source_type || 'investor') === 'investor').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Karyawan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{sources.filter(s => (s.source_type || 'investor') === 'karyawan').length}</div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sources List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Role</CardTitle>
              <CardDescription>Owner, investor, dan karyawan yang terdaftar</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-gray-500">Loading...</div>
              ) : sources.length === 0 ? (
                <div className="text-center text-gray-500">Belum ada sumber dana</div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => {
                    const sourceType = source.source_type || 'investor';
                    const roleDisplay = sourceType === 'owner' ? '👤 Owner' : sourceType === 'karyawan' ? '👨‍💼 Karyawan' : '🤝 Investor';
                    const badgeVariant = sourceType === 'owner' ? 'default' : sourceType === 'karyawan' ? 'outline' : 'secondary';
                    
                    return (
                      <div key={source.id} className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{source.name}</h3>
                              <Badge variant={badgeVariant}>
                                {roleDisplay}
                              </Badge>
                            </div>
                            {source.phone && (
                              <p className="text-sm text-gray-600 mt-1">{source.phone}</p>
                            )}
                            {source.notes && (
                              <p className="text-sm text-gray-600 italic mt-2">Catatan: {source.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(source)}
                              className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                              title="Edit"
                            >
                              <PencilLine className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(source.id)}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
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

        {/* Add/Edit Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Role' : 'Tambah Role'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-gray-700">Tipe Role*</Label>
                  <Select value={formData.source_type} onValueChange={(val: any) => setFormData({ ...formData, source_type: val })}>
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
                  <Label htmlFor="name" className="text-gray-700">Nama*</Label>
                  <Input
                    id="name"
                    placeholder="Nama lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-700">Nomor HP</Label>
                  <Input
                    id="phone"
                    placeholder="0812-3456-7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-gray-700">Catatan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Menyimpan...' : (editingId ? 'Perbarui' : 'Tambah')}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setFormData({
                          source_type: 'investor',
                          name: '',
                          phone: '',
                          notes: ''
                        });
                      }}
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
