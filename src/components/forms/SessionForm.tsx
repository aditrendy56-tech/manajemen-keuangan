'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface SessionFormData {
  date: string;
  opening_cash: number;
  notes: string;
}

interface SessionFormProps {
  onSubmit: (data: SessionFormData) => Promise<void>;
  loading?: boolean;
  onDateChange?: (date: string) => void;
  disableSubmit?: boolean;
  duplicateWarning?: boolean;
  existingDates?: string[];
}

export function SessionForm({ 
  onSubmit, 
  loading = false,
  onDateChange,
  disableSubmit = false,
  duplicateWarning = false,
  existingDates = [],
}: SessionFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [openingCash, setOpeningCash] = useState('0');
  const [notes, setNotes] = useState('');
  const isDuplicateDate = existingDates.includes(date);

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    onDateChange?.(nextDate);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate opening cash
    const parsedCash = parseFloat(openingCash);
    if (isNaN(parsedCash) || parsedCash < 0) {
      alert('Modal awal harus angka positif atau 0');
      return;
    }
    
    // Check duplicate date
    if (isDuplicateDate) {
      alert('⚠️ Sesi untuk tanggal ini sudah terbuka. Tutup sesi lama atau ubah tanggal.');
      return;
    }
    
    console.log('[SessionForm] handleSubmit called with date:', date);
    await onSubmit({
      date,
      opening_cash: parsedCash,
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
          {(duplicateWarning || isDuplicateDate) && (
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
              onChange={(e) => handleDateChange(e.target.value)}
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
            disabled={loading || disableSubmit || isDuplicateDate} 
            type="submit" 
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
            title={isDuplicateDate ? "Tanggal ini sudah ada sesi terbuka" : disableSubmit ? "Tutup sesi lama terlebih dahulu" : ""}
          >
            {loading ? 'Memproses...' : isDuplicateDate ? 'Tanggal Sudah Ada' : 'Buka Sesi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
