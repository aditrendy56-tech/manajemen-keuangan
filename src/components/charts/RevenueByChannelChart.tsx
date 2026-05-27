'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueByChannelChartProps {
  data: {
    offline: number;
    shopeefood: number;
    gofood: number;
  };
}

export function RevenueByChannelChart({ data }: RevenueByChannelChartProps) {
  const chartData = [
    { name: 'Offline', value: data.offline },
    { name: 'ShopeeFood', value: data.shopeefood },
    { name: 'GoFood', value: data.gofood },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendapatan per Channel</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value: any) => `Rp ${(value as number).toLocaleString('id-ID')}`} contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }} cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }} />
            <Bar dataKey="value" fill="#ea580c" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}