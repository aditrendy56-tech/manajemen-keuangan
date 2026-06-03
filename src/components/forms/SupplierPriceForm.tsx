'use client';

import { useState, useRef } from 'react';
import { SupplierPrice, RawMaterial } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface SupplierPriceFormProps {
  supplierId: string;
  materials: RawMaterial[];
  onSuccess?: (price: SupplierPrice) => void;
  onCancel?: () => void;
}

export default function SupplierPriceForm({
  supplierId,
  materials,
  onSuccess,
  onCancel,
}: SupplierPriceFormProps) {
  const [formData, setFormData] = useState({
    raw_material_id: '',
    unit_price: '',
    minimum_order: '',
    notes: '',
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
      if (!formData.raw_material_id || !formData.unit_price) {
        throw new Error('Material dan harga harus diisi');
      }

      const payload = {
        supplier_id: supplierId,
        raw_material_id: formData.raw_material_id,
        unit_price: parseFloat(formData.unit_price),
        minimum_order: formData.minimum_order
          ? parseInt(formData.minimum_order)
          : null,
        notes: formData.notes,
      };

      const response = await fetch('/api/supplier-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan harga supplier');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: 'Harga supplier berhasil ditambahkan!',
      });

      if (formRef.current) {
        formRef.current.reset();
      }

      setFormData({
        raw_material_id: '',
        unit_price: '',
        minimum_order: '',
        notes: '',
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(data), 500);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Gagal menyimpan harga',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border border-orange-200">
      <h3 className="text-lg font-semibold mb-4 text-orange-900">
        Tambah / Update Harga Material
      </h3>

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
            <Label htmlFor="raw_material_id" className="text-sm font-medium">
              Pilih Barang *
            </Label>
            <select
              id="raw_material_id"
              name="raw_material_id"
              value={formData.raw_material_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500"
              required
            >
              <option value="">-- Pilih Barang --</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="unit_price" className="text-sm font-medium">
              Harga per Unit *
            </Label>
            <Input
              id="unit_price"
              name="unit_price"
              type="number"
              step="100"
              value={formData.unit_price}
              onChange={handleChange}
              placeholder="50000"
              required
            />
          </div>

          <div>
            <Label htmlFor="minimum_order" className="text-sm font-medium">
              Minimal Pemesanan
            </Label>
            <Input
              id="minimum_order"
              name="minimum_order"
              type="number"
              value={formData.minimum_order}
              onChange={handleChange}
              placeholder="5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Catatan
          </Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Misal: Promo 10% untuk order >= 10 unit"
            rows={2}
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
            {loading ? 'Menyimpan...' : 'Simpan Harga'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
