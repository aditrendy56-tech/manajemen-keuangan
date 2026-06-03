'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';
import { Trash2 } from 'lucide-react';
import { useOutlet } from '@/lib/context/OutletContext';

export default function ProductsPage() {
  const { outletId } = useOutlet();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priceOffline, setPriceOffline] = useState('');
  const [priceShopeefood, setPriceShopeefood] = useState('');
  const [priceGofood, setPriceGofood] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  async function fetchProducts() {
    try {
      setFetching(true);
      if (!outletId) {
        setProducts([]);
        return;
      }
      const response = await fetch(`/api/products?outlet_id=${outletId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleAddProduct() {
    const anyPrice = price || priceOffline || priceShopeefood || priceGofood;
    if (!name || !anyPrice) {
      alert('Nama produk dan minimal satu harga harus diisi');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          name,
          price_offline: priceOffline ? parseFloat(priceOffline) : price ? parseFloat(price) : null,
          price_shopeefood: priceShopeefood ? parseFloat(priceShopeefood) : price ? parseFloat(price) : null,
          price_gofood: priceGofood ? parseFloat(priceGofood) : price ? parseFloat(price) : null,
          description,
          is_active: true,
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts([...products, newProduct]);
        setName('');
        setPrice('');
        setPriceOffline('');
        setPriceShopeefood('');
        setPriceGofood('');
        setDescription('');
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Gagal menambah produk');
      }
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProducts(products.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }

  async function handleToggle(id: string, is_active: boolean) {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !is_active }),
      });
      if (response.ok) {
        setProducts(products.map((p) => (p.id === id ? { ...p, is_active: !is_active } : p)));
      }
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  }

  const formatPrice = (value?: number | null) => `Rp ${(Number(value || 0)).toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Produk</h1>
        <p className="text-gray-600">Kelola daftar produk yang dijual</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
              <p className="text-xs text-gray-500">
                Harga yang ditampilkan adalah harga gross per channel. Platform fee dihitung terpisah dari pengaturan.
              </p>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="py-8 text-center text-gray-500">Memuat produk...</div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Tidak ada produk</div>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-start justify-between gap-4 rounded border p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{product.name}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                          <span>Offline: {formatPrice(product.price_offline ?? product.price ?? 0)}</span>
                          <span>ShopeeFood: {formatPrice(product.price_shopeefood ?? product.price ?? 0)}</span>
                          <span>GoFood: {formatPrice(product.price_gofood ?? product.price ?? 0)}</span>
                        </div>
                        {product.description && <p className="mt-1 text-xs text-gray-400">{product.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant={product.is_active ? 'default' : 'outline'}
                          onClick={() => handleToggle(product.id, product.is_active)}
                        >
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tambah Produk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Harga dasar adalah fallback kalau harga channel belum diisi. Kalau hanya isi harga dasar, sistem akan memakainya untuk semua channel.
                </p>

                <div>
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Roti Bakar Standar"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Harga Dasar / Fallback (Rp)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai jika harga offline, ShopeeFood, atau GoFood belum diisi.</p>
                </div>

                <div>
                  <Label htmlFor="price_offline">Harga Offline (Rp)</Label>
                  <Input
                    id="price_offline"
                    type="number"
                    value={priceOffline}
                    onChange={(e) => setPriceOffline(e.target.value)}
                    placeholder="Opsional: harga khusus offline"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk penjualan langsung di toko.</p>
                </div>

                <div>
                  <Label htmlFor="price_shopeefood">Harga ShopeeFood (Rp)</Label>
                  <Input
                    id="price_shopeefood"
                    type="number"
                    value={priceShopeefood}
                    onChange={(e) => setPriceShopeefood(e.target.value)}
                    placeholder="Opsional: harga di ShopeeFood"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk transaksi yang dijual di aplikasi ShopeeFood.</p>
                </div>

                <div>
                  <Label htmlFor="price_gofood">Harga GoFood (Rp)</Label>
                  <Input
                    id="price_gofood"
                    type="number"
                    value={priceGofood}
                    onChange={(e) => setPriceGofood(e.target.value)}
                    placeholder="Opsional: harga di GoFood"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk transaksi yang dijual di aplikasi GoFood.</p>
                </div>

                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi produk"
                  />
                </div>

                <Button onClick={handleAddProduct} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                  {loading ? 'Menambah...' : 'Tambah Produk'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
