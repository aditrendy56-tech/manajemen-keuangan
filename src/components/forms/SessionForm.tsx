'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface SessionFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
  onDateChange?: (date: string) => void;
  disableSubmit?: boolean;
  duplicateWarning?: boolean;
}

export function SessionForm({ 
  onSubmit, 
  loading = false,
  onDateChange,
  disableSubmit = false,
  duplicateWarning = false,
}: SessionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingCash, setOpeningCash] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    onDateChange?.(date);
  }, [date, onDateChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      date,
      opening_cash: parseFloat(openingCash),
      notes,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buka Sesi Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicateWarning && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription className="text-yellow-800">
                ⚠️ Sesi untuk tanggal ini sudah terbuka. Tutup sesi lama atau ubah tanggal.
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <CurrencyInput
              label="Modal Awal (Rp)"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0"
              required
              showVisual={true}
            />
          </div>
          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan optional..."
            />
          </div>
          <Button 
            disabled={loading || disableSubmit} 
            type="submit" 
            className="w-full bg-orange-600 hover:bg-orange-700"
            title={disableSubmit ? "Tutup sesi lama terlebih dahulu" : ""}
          >
            {loading ? 'Memproses...' : 'Buka Sesi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
