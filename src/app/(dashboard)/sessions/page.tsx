'use client';

import { useState, useEffect } from 'react';
import { SessionForm } from '@/components/forms/SessionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailySession } from '@/types';
import Link from 'next/link';
import { ArrowRight, Trash2, Power } from 'lucide-react';
import { useOutlet } from '@/lib/context/OutletContext';

export default function SessionsPage() {
  const { outletId, setSessionId } = useOutlet();
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchSessions();
  }, [outletId]);

  async function fetchSessions() {
    try {
      setFetching(true);
      const response = await fetch(`/api/sessions?outlet_id=${outletId}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          ...data,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessionId(newSession.id);
        setSessions([newSession, ...sessions]);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseSession(sessionId: string) {
    if (!confirm('Tutup sesi ini? Anda tidak bisa edit data setelah sesi ditutup.')) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (response.ok) {
        setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'closed' } : s));
      }
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Hapus sesi ini? Ini tidak bisa dibatalkan.')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  // Check if selected date already has an OPEN session
  const hasOpenSessionForDate = sessions.some(s => s.date === selectedDate && s.status === 'open');

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
                          {session.status === 'open' ? '🟢 Buka' : '🔴 Tutup'}
                        </span>
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="outline" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        {session.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => handleCloseSession(session.id)}
                            title="Tutup sesi"
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSession(session.id)}
                          title="Hapus sesi"
                        >
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
          <SessionForm 
            onSubmit={handleSubmit} 
            loading={loading}
            onDateChange={setSelectedDate}
            disableSubmit={hasOpenSessionForDate}
            duplicateWarning={hasOpenSessionForDate}
          />
        </div>
      </div>
    </div>
  );
}
