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

export default function RuleModal({ open, onOpenChange, initial, onSave }: Props) {
  const [form, setForm] = React.useState<any>({
    name: '',
    recover_first: true,
    cash_reserve_percent: '10',
    allow_overdraft: false,
    notes: '',
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (initial) setForm({ ...initial, cash_reserve_percent: String(initial.cash_reserve_percent ?? 10) })
    else setForm({ name: '', recover_first: true, cash_reserve_percent: '10', allow_overdraft: false, notes: '' })
  }, [initial, open])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...form, cash_reserve_percent: Number(form.cash_reserve_percent || 0) })
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Rule' : 'Tambah Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nama Rule</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <Label>Kas Reserve %</Label>
            <Input type="number" value={form.cash_reserve_percent} onChange={(e) => setForm({ ...form, cash_reserve_percent: e.target.value })} />
          </div>

          <div>
            <Label>Balik Modal Dulu</Label>
            <Select value={form.recover_first ? 'yes' : 'no'} onValueChange={(val) => setForm({ ...form, recover_first: val === 'yes' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Ya</SelectItem>
                <SelectItem value="no">Tidak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Allow Overdraft</Label>
            <Select value={form.allow_overdraft ? 'yes' : 'no'} onValueChange={(val) => setForm({ ...form, allow_overdraft: val === 'yes' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Ya</SelectItem>
                <SelectItem value="no">Tidak</SelectItem>
              </SelectContent>
            </Select>
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
