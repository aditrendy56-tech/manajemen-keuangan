'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOutlet } from '@/lib/context/OutletContext';

export default function SettingsPage() {
  const router = useRouter();
  const { outletId } = useOutlet();
  const [businessName, setBusinessName] = useState('');
  const [outletName, setOutletName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [feeShopee, setFeeShopee] = useState('20');
  const [feeGofood, setFeeGofood] = useState('25');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, [outletId]);

  async function loadSettings() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/settings?outlet_id=${outletId}`);
      if (!res.ok) throw new Error('Gagal memuat pengaturan');
      const data = await res.json();
      setBusinessName(data.business_name || '');
      setOutletName(data.outlet_name || '');
      setAddress(data.address || '');
      setPhone(data.phone || '');
      setCurrency(data.currency || 'IDR');
      setFeeShopee(data.fee_shopeefood ? String(Number(data.fee_shopeefood) * 100) : '20');
      setFeeGofood(data.fee_gofood ? String(Number(data.fee_gofood) * 100) : '25');
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError('');

      // Validate fee inputs (percent values)
      const feeShopeeNum = feeShopee ? Number(feeShopee) : NaN;
      const feeGofoodNum = feeGofood ? Number(feeGofood) : NaN;
      if (isNaN(feeShopeeNum) || feeShopeeNum < 0 || feeShopeeNum > 100) {
        throw new Error('Fee ShopeeFood harus berupa angka antara 0 dan 100');
      }
      if (isNaN(feeGofoodNum) || feeGofoodNum < 0 || feeGofoodNum > 100) {
        throw new Error('Fee GoFood harus berupa angka antara 0 dan 100');
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          business_name: businessName,
          outlet_name: outletName,
          address,
          phone,
          currency,
          fee_shopeefood: feeShopee ? Number(feeShopee) / 100 : null,
          fee_gofood: feeGofood ? Number(feeGofood) / 100 : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-gray-600">Kelola pengaturan usaha dan akun</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Usaha</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Memuat pengaturan...</div>
          ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="business_name">Nama Usaha</Label>
              <Input
                id="business_name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="outlet_name">Nama Outlet</Label>
              <Input
                id="outlet_name"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="currency">Mata Uang</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value || 'IDR')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Rp)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fee_shopee">Fee ShopeeFood (%)</Label>
              <Input id="fee_shopee" type="number" min={0} max={100} value={feeShopee} onChange={(e) => setFeeShopee(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Masukkan persentase fee platform (contoh: 20 berarti 20%). Sistem menyimpan ini sebagai estimasi dan akan digunakan untuk menghitung platform fee saat input penjualan.</p>
            </div>
            <div>
              <Label htmlFor="fee_gofood">Fee GoFood (%)</Label>
              <Input id="fee_gofood" type="number" min={0} max={100} value={feeGofood} onChange={(e) => setFeeGofood(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Jika Anda tidak tahu nilai fee pasti, isikan angka estimasi. Nanti bisa direkonsiliasi ketika menerima payout dari platform.</p>
            </div>

            {saved && <div className="p-3 bg-green-100 text-green-700 rounded">Pengaturan berhasil disimpan</div>}

            <Button onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-700" disabled={saving || loading}>
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold">user@example.com</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Terakhir login</p>
              <p className="text-lg">Hari ini, 10:30 AM</p>
            </div>
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Bantuan & Dukungan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Versi Aplikasi:</strong> 1.0.0
            </p>
            <p>
              <strong>Terakhir diperbarui:</strong> 22 Mei 2024
            </p>
            <p className="text-gray-600">Untuk bantuan lebih lanjut, hubungi support@example.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}