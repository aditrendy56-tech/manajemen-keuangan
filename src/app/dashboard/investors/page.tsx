'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useOutlet } from '@/lib/context/OutletContext';

interface Role {
  id: string;
  outlet_id: string;
  name: string;
  source_type: 'owner' | 'investor' | 'karyawan';
  phone?: string;
  notes?: string;
  created_at: string;
}

export default function InvestorsPage() {
  const { outletId } = useOutlet();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    source_type: 'investor' as 'owner' | 'investor' | 'karyawan',
    name: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchRoles();
  }, [outletId]);

  async function fetchRoles() {
    try {
      setLoading(true);
      const res = await fetch(`/api/investors?outlet_id=${outletId}`);
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Nama harus diisi');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        outlet_id: outletId,
        source_type: form.source_type,
        name: form.name,
        phone: form.phone || null,
        notes: form.notes || null,
        priority_order: editingId ? undefined : roles.length + 1,
      };

      if (editingId) {
        const res = await fetch('/api/investors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
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

      setForm({ source_type: 'investor', name: '', phone: '', notes: '' });
      setEditingId(null);
      await fetchRoles();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error saving role');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus role ini?')) return;
    try {
      const res = await fetch(`/api/investors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal hapus');
      await fetchRoles();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting role');
    }
  }

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

  const ownerCount = roles.filter((r) => r.source_type === 'owner').length;
  const investorCount = roles.filter((r) => r.source_type === 'investor').length;
  const employeeCount = roles.filter((r) => r.source_type === 'karyawan').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kelola Role</h1>
        <p className="text-gray-600">Atur owner, investor, dan karyawan yang akan menerima alokasi laba</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Role</p>
            <p className="text-2xl font-bold">{roles.length}</p>
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
            <CardTitle>{editingId ? 'Edit Role' : 'Tambah Role Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipe Role*</Label>
                <Select
                  value={form.source_type}
                  onValueChange={(val: any) => setForm({ ...form, source_type: val })}
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
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama owner/investor/karyawan"
                  required
                />
              </div>

              <div>
                <Label>Telepon (opsional)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xx..."
                />
              </div>

              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {submitting ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ source_type: 'investor', name: '', phone: '', notes: '' });
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
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Loading...
              </CardContent>
            </Card>
          ) : roles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Belum ada role. Tambahkan yang pertama!
              </CardContent>
            </Card>
          ) : (
            roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{roleIcon[role.source_type]}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{role.name}</h3>
                          <p className="text-sm text-gray-600">{roleLabel[role.source_type]}</p>
                        </div>
                      </div>
                      {role.phone && (
                        <p className="text-sm text-gray-600">📞 {role.phone}</p>
                      )}
                      {role.notes && (
                        <p className="text-sm text-gray-600 italic mt-2">💬 {role.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(role.id);
                          setForm({
                            source_type: role.source_type,
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
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
