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
      <CardContent className="pt-4 flex justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name}: ${typeof percent === 'number' ? (percent * 100).toFixed(0) : 0}%`} outerRadius={70} fill="#8884d8" dataKey="value" animationDuration={300}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value} contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}