'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types';
import { Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      outlet_id: 'outlet-1',
      name: 'Roti Bakar Standar',
      price: 5000,
      description: 'Roti bakar dengan topping standar',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      outlet_id: 'outlet-1',
      name: 'Roti Bakar Premium',
      price: 10000,
      description: 'Roti bakar dengan topping premium',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  function handleAddProduct() {
    if (!name || !price) {
      alert('Nama dan harga harus diisi');
      return;
    }
    const newProduct: Product = {
      id: Math.random().toString(36),
      outlet_id: 'outlet-1',
      name,
      price: parseFloat(price),
      description,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setProducts([...products, newProduct]);
    setName('');
    setPrice('');
    setDescription('');
  }

  function handleDelete(id: string) {
    setProducts(products.filter((p) => p.id !== id));
  }

  function handleToggle(id: string) {
    setProducts(products.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Produk</h1>
        <p className="text-gray-600">Kelola daftar produk yang dijual</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada produk</div>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <div key={product.id} className="flex justify-between items-center py-3 px-4 border rounded">
                      <div className="flex-1">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-gray-500">Rp {product.price.toLocaleString('id-ID')}</p>
                        {product.description && <p className="text-xs text-gray-400">{product.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={product.is_active ? 'default' : 'outline'}
                          onClick={() => handleToggle(product.id)}
                        >
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-4 h-4" />
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
                  <Label htmlFor="price">Harga (Rp)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                  />
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
                <Button onClick={handleAddProduct} className="w-full bg-orange-600 hover:bg-orange-700">
                  Tambah Produk
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
