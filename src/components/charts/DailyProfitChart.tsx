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
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value} />
            <Legend />
            <Line type="monotone" dataKey="profit" stroke="#ea580c" strokeWidth={2} dot={{ fill: '#ea580c' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}