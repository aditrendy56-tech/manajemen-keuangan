'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: any;
  onSave: (data: any) => Promise<void>;
}

export default function StakeholderModal({ open, onOpenChange, initial, onSave }: Props) {
  const [form, setForm] = React.useState<any>({
    name: '',
    role: 'owner',
    investor_id: '',
    notes: '',
    is_active: true,
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (initial) setForm({ ...initial })
    else setForm({ name: '', role: 'owner', investor_id: '', notes: '', is_active: true })
  }, [initial, open])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(form)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan stakeholder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Stakeholder' : 'Tambah Stakeholder'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nama</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(val: any) => setForm({ ...form, role: val })}>
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
            <Label>Investor ID (opsional)</Label>
            <Input value={form.investor_id} onChange={(e) => setForm({ ...form, investor_id: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">Hanya gunakan jika stakeholder owner/investor ingin dihubungkan ke sumber modal yang sudah ada.</p>
          </div>

          <div>
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
