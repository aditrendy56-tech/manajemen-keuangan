'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyProfitChartProps {
  data: Array<{
    date: string;
    profit: number;
  }>;
}

export function DailyProfitChart({ data }: DailyProfitChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Keuntungan 7 Hari</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value) => typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value} contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }} cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="profit" stroke="#ea580c" strokeWidth={2} dot={{ fill: '#ea580c', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}