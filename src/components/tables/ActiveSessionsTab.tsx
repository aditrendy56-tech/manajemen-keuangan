'use client';

import { useState, useEffect } from 'react';
import { SessionForm } from '@/components/forms/SessionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DailySession } from '@/types';
import Link from 'next/link';
import { ArrowRight, Trash2, Power } from 'lucide-react';

interface ActiveSessionsTabProps {
  outletId: string;
  periodId: string;
  periodLocked: boolean;
  sessions: DailySession[];
  onSessionCreated: (session: DailySession) => void;
  onSessionUpdated: (session: DailySession) => void;
  onRefresh: () => void;
}

export function ActiveSessionsTab({
  outletId,
  periodId,
  periodLocked,
  sessions,
  onSessionCreated,
  onSessionUpdated,
  onRefresh,
}: ActiveSessionsTabProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    console.log('[ActiveSessionsTab] handleSubmit called with:', data);
    setLoading(true);
    try {
      const payload = {
        outlet_id: outletId,
        ...data,
      };
      console.log('[ActiveSessionsTab] Sending POST to /api/sessions:', payload);
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[ActiveSessionsTab] Response status:', response.status);

      if (response.ok) {
        const newSession = await response.json();
        console.log('[ActiveSessionsTab] Created session:', newSession);
        
        // API now returns session directly
        if (newSession && newSession.id) {
          onSessionCreated(newSession);
          alert('✅ Sesi berhasil dibuat!');
        } else {
          console.error('[ActiveSessionsTab] Invalid session response:', newSession);
          alert('⚠️ Sesi dibuat tapi response tidak valid');
        }
      } else {
        const errorData = await response.json();
        console.error('[ActiveSessionsTab] Error response:', errorData);
        alert(`❌ Error: ${errorData.error || errorData.message || 'Gagal membuat sesi'}`);
      }
    } catch (error) {
      console.error('[ActiveSessionsTab] Error creating session:', error);
      alert(`❌ Gagal membuat sesi: ${error instanceof Error ? error.message : String(error)}`);
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
        onSessionUpdated({ ...sessions.find((s) => s.id === sessionId)!, status: 'closed' });
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('Gagal menutup sesi');
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Hapus sesi ini? Ini tidak bisa dibatalkan.')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Gagal menghapus sesi');
    }
  }

  const activeSessions = sessions.filter((s) => s.status === 'open' && !s.is_locked);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* LEFT: Active Sessions List (3 cols) */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Sesi Aktif ({activeSessions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Tidak ada sesi aktif</div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex justify-between items-center py-3 px-4 border rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{session.date}</p>
                      <p className="text-sm text-gray-500">
                        Modal Awal: Rp {session.opening_cash?.toLocaleString('id-ID') || '0'}
                      </p>
                      {session.closing_cash && (
                        <p className="text-sm text-gray-500">
                          Modal Akhir: Rp {session.closing_cash.toLocaleString('id-ID')}
                        </p>
                      )}
                      {session.total_revenue && (
                        <p className="text-sm text-green-600 font-semibold">
                          Revenue: Rp {session.total_revenue.toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded text-sm font-semibold bg-green-100 text-green-800">
                        🟢 Buka
                      </span>
                      <Link href={`/dashboard/sessions/${session.id}`}>
                        <Button variant="outline" size="sm">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => handleCloseSession(session.id)}
                        title="Tutup sesi"
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-800"
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

      {/* RIGHT: Create Form Sidebar (1 col) */}
      <div className="lg:col-span-1">
        {!periodLocked ? (
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Buka Sesi Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionForm 
                onSubmit={handleSubmit} 
                loading={loading}
                existingDates={activeSessions.map((s) => s.date)}
              />
            </CardContent>
          </Card>
        ) : (
          <Alert className="border-red-200 bg-red-50 sticky top-6">
            <AlertDescription className="text-red-800 text-sm">
              🔒 Periode sudah ditutup. Tidak bisa membuat sesi baru.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
