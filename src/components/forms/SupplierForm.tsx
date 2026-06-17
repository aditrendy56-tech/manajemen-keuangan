'use client';

import { useState, useRef } from 'react';
import { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface SupplierFormProps {
  outletId: string;
  supplier?: Supplier;
  onSuccess?: (supplier: Supplier) => void;
  onCancel?: () => void;
}

export default function SupplierForm({
  outletId,
  supplier,
  onSuccess,
  onCancel,
}: SupplierFormProps) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    whatsapp: supplier?.whatsapp || '',
    address: supplier?.address || '',
    opening_hours: supplier?.opening_hours || '',
    quality_rating: supplier?.quality_rating?.toString() || '',
    reliability: supplier?.reliability || 'Good',
    notes: supplier?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        outlet_id: outletId,
        ...formData,
        quality_rating: formData.quality_rating
          ? parseFloat(formData.quality_rating)
          : null,
        ...(supplier && { id: supplier.id }),
      };

      const method = supplier ? 'PUT' : 'POST';
      const response = await fetch('/api/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${supplier ? 'update' : 'create'} supplier`);
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Supplier berhasil ${supplier ? 'diperbarui' : 'ditambahkan'}!`,
      });

      if (formRef.current) {
        formRef.current.reset();
      }

      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        whatsapp: '',
        address: '',
        opening_hours: '',
        quality_rating: '',
        reliability: 'Good',
        notes: '',
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(data), 500);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan supplier';
      setMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border border-orange-200">
      <h2 className="text-lg font-semibold mb-4 text-orange-900">
        {supplier ? 'Edit Distributor' : 'Tambah Distributor Baru'}
      </h2>

      {message && (
        <Alert
          className={`mb-4 bg-white dark:bg-slate-700 ${
            message.type === 'success'
              ? 'text-green-800 border-green-200 dark:text-green-300'
              : 'text-red-800 border-red-200 dark:text-red-300'
          }`}
        >
          {message.text}
        </Alert>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Nama Distributor *
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Toko Bahan A / Distributor XYZ"
              required
            />
          </div>

          <div>
            <Label htmlFor="contact_person" className="text-sm font-medium">
              Nama Kontak
            </Label>
            <Input
              id="contact_person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="Pak Ahmad"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              No. Telepon
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0812-3456-7890"
              type="tel"
            />
          </div>

          <div>
            <Label htmlFor="whatsapp" className="text-sm font-medium">
              No. WhatsApp
            </Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="0812-3456-7890"
              type="tel"
            />
          </div>

          <div>
            <Label htmlFor="opening_hours" className="text-sm font-medium">
              Jam Operasional
            </Label>
            <Input
              id="opening_hours"
              name="opening_hours"
              value={formData.opening_hours}
              onChange={handleChange}
              placeholder="08:00 - 17:00"
            />
          </div>

          <div>
            <Label htmlFor="quality_rating" className="text-sm font-medium">
              Rating Kualitas (0-5)
            </Label>
            <Input
              id="quality_rating"
              name="quality_rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.quality_rating}
              onChange={handleChange}
              placeholder="4.5"
            />
          </div>

          <div>
            <Label htmlFor="reliability" className="text-sm font-medium">
              Keandalan
            </Label>
            <select
              name="reliability"
              value={formData.reliability}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
            >
              <option value="Good">Good (Stok selalu ada)</option>
              <option value="Excellent">Excellent (Sangat responsif)</option>
              <option value="Poor">Poor (Sering bermasalah)</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="address" className="text-sm font-medium">
            Alamat
          </Label>
          <Textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Jl. Contoh No 123, Lampung"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Catatan / Keterangan
          </Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Misal: Min order Rp 500k, delivery 2 hari, etc"
            rows={3}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Menyimpan...' : supplier ? 'Perbarui' : 'Tambah'} Distributor
          </Button>
        </div>
      </form>
    </Card>
  );
}
