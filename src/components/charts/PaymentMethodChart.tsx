'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentMethodChartProps {
  data: {
    cash: number;
    qris: number;
  };
}

const COLORS = ['#ea580c', '#fb923c'];

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData = [
    { name: 'Cash', value: data.cash },
    { name: 'QRIS', value: data.qris },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metode Pembayaran</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${typeof percent === 'number' ? (percent * 100).toFixed(0) : 0}%`} outerRadius={80} fill="#8884d8" dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}