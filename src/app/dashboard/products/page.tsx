'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';
import { Trash2, Edit2, X } from 'lucide-react';
import { useOutlet } from '@/lib/context/OutletContext';

export default function ProductsPage() {
  const { outletId } = useOutlet();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priceOffline, setPriceOffline] = useState('');
  const [priceShopeefood, setPriceShopeefood] = useState('');
  const [priceGofood, setPriceGofood] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceOffline, setEditPriceOffline] = useState('');
  const [editPriceShopeefood, setEditPriceShopeefood] = useState('');
  const [editPriceGofood, setEditPriceGofood] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setFetching(true);
      if (!outletId) {
        setProducts([]);
        return;
      }
      const response = await fetch(`/api/products?outlet_id=${outletId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('fetchProducts received data:', data);
        console.log('First product:', data?.[0]);
        if (Array.isArray(data)) {
          const validatedData = data as Product[];
          setProducts(validatedData);
        } else {
          console.error('Expected array, got:', typeof data);
          setProducts([]);
        }
      } else {
        console.error('Fetch failed with status:', response.status);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setFetching(false);
    }
  }, [outletId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProducts();
  }, [fetchProducts]);

  function calculateMargin(sellPrice: number, cost: number): number {
    if (sellPrice <= 0) return 0;
    return ((sellPrice - cost) / sellPrice) * 100;
  }

  async function handleAddProduct() {
    const anyPrice = price || priceOffline || priceShopeefood || priceGofood;
    if (!name || !anyPrice) {
      alert('Nama produk dan minimal satu harga harus diisi');
      return;
    }

    setLoading(true);
    try {
      const finalPrice = priceOffline ? parseFloat(priceOffline) : price ? parseFloat(price) : 0;
      const finalCostPrice = costPrice ? parseFloat(costPrice) : finalPrice * 0.4; // Default 40% cost
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          name,
          price_offline: priceOffline ? parseFloat(priceOffline) : price ? parseFloat(price) : null,
          price_shopeefood: priceShopeefood ? parseFloat(priceShopeefood) : price ? parseFloat(price) : null,
          price_gofood: priceGofood ? parseFloat(priceGofood) : price ? parseFloat(price) : null,
          cost_price: finalCostPrice,
          description,
          is_active: true,
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts((currentProducts) => [...currentProducts, newProduct]);
        setName('');
        setPrice('');
        setPriceOffline('');
        setPriceShopeefood('');
        setPriceGofood('');
        setCostPrice('');
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
    if (!confirm('Hapus produk ini?')) return;
    alert('Fitur delete belum tersedia');
  }

  async function handleToggle(id: string, is_active: boolean) {
    alert('Fitur toggle belum tersedia');
  }

  function startEdit(product: Product) {
    if (!product) {
      alert('Product object tidak ada');
      return;
    }
    console.log('startEdit called with product:', product);
    console.log('product.id value:', product.id);
    
    if (!product.id) {
      alert('Product ID tidak ditemukan. Product: ' + JSON.stringify(product));
      return;
    }
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price?.toString() || '');
    setEditPriceOffline(product.price_offline?.toString() || '');
    setEditPriceShopeefood(product.price_shopeefood?.toString() || '');
    setEditPriceGofood(product.price_gofood?.toString() || '');
    setEditCostPrice(product.cost_price?.toString() || '');
    setEditDescription(product.description || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
    setEditPriceOffline('');
    setEditPriceShopeefood('');
    setEditPriceGofood('');
    setEditCostPrice('');
    setEditDescription('');
  }

  async function handleUpdateProduct() {
    if (!editingId) {
      alert('ID produk tidak valid');
      return;
    }
    console.log('handleUpdateProduct called, using editingId:', editingId);

    if (!editName.trim()) {
      alert('Nama produk harus diisi');
      return;
    }

    const anyPrice = editPrice || editPriceOffline || editPriceShopeefood || editPriceGofood;
    if (!anyPrice) {
      alert('Minimal satu harga harus diisi');
      return;
    }

    setLoading(true);
    try {
      const finalPrice = editPriceOffline ? parseFloat(editPriceOffline) : editPrice ? parseFloat(editPrice) : 0;
      const finalCostPrice = editCostPrice ? parseFloat(editCostPrice) : finalPrice * 0.4;

      const requestBody = {
        name: editName,
        price_offline: editPriceOffline ? parseFloat(editPriceOffline) : editPrice ? parseFloat(editPrice) : null,
        price_shopeefood: editPriceShopeefood ? parseFloat(editPriceShopeefood) : editPrice ? parseFloat(editPrice) : null,
        price_gofood: editPriceGofood ? parseFloat(editPriceGofood) : editPrice ? parseFloat(editPrice) : null,
        cost_price: finalCostPrice,
        description: editDescription,
      };
      
      console.log('Sending PUT request to /api/products/' + editingId);
      console.log('Request body:', requestBody);

      const response = await fetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const updatedProduct = await response.json();
        console.log('Update successful:', updatedProduct);
        setProducts((currentProducts) => currentProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
        cancelEdit();
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('Update failed:', data);
        alert(data.error || 'Gagal update produk');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('Error updating product: ' + message);
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <div>
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
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-blue-600">
                          <span>💵 HPP: {formatPrice(product.cost_price ?? 0)}</span>
                          {product.price_offline && (
                            <span>📊 Margin: {(((product.price_offline - (product.cost_price ?? 0)) / product.price_offline) * 100).toFixed(1)}%</span>
                          )}
                        </div>
                        {product.description && <p className="mt-1 text-xs text-gray-400">{product.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
              <CardTitle>{editingId ? 'Edit Produk' : 'Tambah Produk'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editingId && (
                  <Button
                    onClick={cancelEdit}
                    variant="outline"
                    size="sm"
                    className="w-full mb-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Batal Edit
                  </Button>
                )}

                <p className="text-xs text-gray-500">
                  Harga dasar adalah fallback kalau harga channel belum diisi. Kalau hanya isi harga dasar, sistem akan memakainya untuk semua channel.
                </p>

                <div>
                  <Label htmlFor="product_name">Nama Produk</Label>
                  <Input
                    id="product_name"
                    value={editingId ? editName : name}
                    onChange={(e) => {
                      if (editingId) {
                        setEditName(e.target.value);
                      } else {
                        setName(e.target.value);
                      }
                    }}
                    placeholder="Contoh: Roti Bakar Standar"
                  />
                </div>

                <div>
                  <Label htmlFor="product_price">Harga Dasar / Fallback (Rp)</Label>
                  <Input
                    id="product_price"
                    type="number"
                    value={editingId ? editPrice : price}
                    onChange={(e) => {
                      if (editingId) {
                        setEditPrice(e.target.value);
                      } else {
                        setPrice(e.target.value);
                      }
                    }}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai jika harga offline, ShopeeFood, atau GoFood belum diisi.</p>
                </div>

                <div>
                  <Label htmlFor="product_price_offline">Harga Offline (Rp)</Label>
                  <Input
                    id="product_price_offline"
                    type="number"
                    value={editingId ? editPriceOffline : priceOffline}
                    onChange={(e) => {
                      if (editingId) {
                        setEditPriceOffline(e.target.value);
                      } else {
                        setPriceOffline(e.target.value);
                      }
                    }}
                    placeholder="Opsional: harga khusus offline"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk penjualan langsung di toko.</p>
                </div>

                <div>
                  <Label htmlFor="product_price_shopeefood">Harga ShopeeFood (Rp)</Label>
                  <Input
                    id="product_price_shopeefood"
                    type="number"
                    value={editingId ? editPriceShopeefood : priceShopeefood}
                    onChange={(e) => {
                      if (editingId) {
                        setEditPriceShopeefood(e.target.value);
                      } else {
                        setPriceShopeefood(e.target.value);
                      }
                    }}
                    placeholder="Opsional: harga di ShopeeFood"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk transaksi yang dijual di aplikasi ShopeeFood.</p>
                </div>

                <div>
                  <Label htmlFor="product_price_gofood">Harga GoFood (Rp)</Label>
                  <Input
                    id="product_price_gofood"
                    type="number"
                    value={editingId ? editPriceGofood : priceGofood}
                    onChange={(e) => {
                      if (editingId) {
                        setEditPriceGofood(e.target.value);
                      } else {
                        setPriceGofood(e.target.value);
                      }
                    }}
                    placeholder="Opsional: harga di GoFood"
                  />
                  <p className="mt-1 text-xs text-gray-500">Dipakai untuk transaksi yang dijual di aplikasi GoFood.</p>
                </div>

                <div>
                  <Label htmlFor="product_cost_price">Harga Pokok (HPP) - Rp</Label>
                  <Input
                    id="product_cost_price"
                    type="number"
                    value={editingId ? editCostPrice : costPrice}
                    onChange={(e) => {
                      if (editingId) {
                        setEditCostPrice(e.target.value);
                      } else {
                        setCostPrice(e.target.value);
                      }
                    }}
                    placeholder="Otomatis: 40% dari harga jual jika kosong"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {(editingId ? editPrice || editPriceOffline : price || priceOffline) ? (
                      <>
                        Default 40%: {formatPrice((Number(editingId ? editPrice || editPriceOffline : price || priceOffline) || 0) * 0.4)}
                        {(editingId ? editCostPrice : costPrice) && (
                          <>
                            <br />
                            Margin: {calculateMargin(parseFloat((editingId ? editPrice || editPriceOffline : price || priceOffline) || '0'), parseFloat(editingId ? editCostPrice : costPrice)).toFixed(1)}%
                          </>
                        )}
                      </>
                    ) : (
                      'Input harga jual dulu untuk lihat default HPP'
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="product_description">Deskripsi</Label>
                  <Textarea
                    id="product_description"
                    value={editingId ? editDescription : description}
                    onChange={(e) => {
                      if (editingId) {
                        setEditDescription(e.target.value);
                      } else {
                        setDescription(e.target.value);
                      }
                    }}
                    placeholder="Deskripsi produk"
                  />
                </div>

                {editingId ? (
                  <Button
                    onClick={handleUpdateProduct}
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {loading ? 'Mengupdate...' : 'Update Produk'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddProduct}
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {loading ? 'Menambah...' : 'Tambah Produk'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
