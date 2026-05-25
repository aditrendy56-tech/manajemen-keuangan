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
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: any) => `Rp ${(value as number).toLocaleString('id-ID')}`} />
            <Bar dataKey="value" fill="#ea580c" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}