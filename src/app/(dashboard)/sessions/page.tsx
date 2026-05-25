'use client';

import { useState } from 'react';
import { SessionForm } from '@/components/forms/SessionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailySession } from '@/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<DailySession[]>([
    {
      id: 'session-1',
      outlet_id: 'outlet-1',
      date: new Date().toISOString().split('T')[0],
      opening_cash: 500000,
      closing_cash: null,
      status: 'open',
      notes: 'Sesi hari ini',
      created_at: new Date().toISOString(),
    },
    {
      id: 'session-2',
      outlet_id: 'outlet-1',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      opening_cash: 400000,
      closing_cash: 750000,
      status: 'closed',
      notes: 'Sesi kemarin',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const newSession: DailySession = {
        id: Math.random().toString(36),
        outlet_id: 'outlet-1',
        status: 'open',
        closing_cash: null,
        ...data,
        created_at: new Date().toISOString(),
      };
      setSessions([newSession, ...sessions]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sesi Harian</h1>
        <p className="text-gray-600">Kelola sesi harian untuk setiap outlet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Sesi</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Tidak ada data sesi</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex justify-between items-center py-3 px-4 border rounded hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-semibold">{session.date}</p>
                        <p className="text-sm text-gray-500">Modal Awal: Rp {session.opening_cash.toLocaleString('id-ID')}</p>
                        {session.closing_cash && (
                          <p className="text-sm text-gray-500">Modal Akhir: Rp {session.closing_cash.toLocaleString('id-ID')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            session.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {session.status === 'open' ? 'Buka' : 'Tutup'}
                        </span>
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="outline" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <SessionForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}
