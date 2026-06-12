'use client';

import { useState, useEffect } from 'react';
import { DailySession } from '@/types';
import { useOutlet } from '@/lib/context/OutletContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodInfoBanner } from '@/components/layout/PeriodInfoBanner';
import { TutupBukuModal } from '@/components/modals/TutupBukuModal';
import { ActiveSessionsTab } from '@/components/tables/ActiveSessionsTab';
import { HistoricalSessionsTab } from '@/components/tables/HistoricalSessionsTab';

interface Period {
  id: string;
  outlet_id: string;
  period_month: string;
  period_start_date: string;
  period_end_date: string;
  status: 'active' | 'closed';
  is_locked: boolean;
}

export default function SessionsPage() {
  const { outletId, setSessionId } = useOutlet();
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [fetching, setFetching] = useState(true);
  const [tutupBukuModalOpen, setTutupBukuModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchData();
  }, [outletId]);

  async function fetchData() {
    try {
      setFetching(true);

      // Fetch current period
      const periodRes = await fetch(`/api/periods?outlet_id=${outletId}&status=active&limit=1`);
      if (periodRes.ok) {
        const periodData = await periodRes.json();
        if (periodData.periods && periodData.periods.length > 0) {
          setPeriod(periodData.periods[0]);
        }
      }

      // Fetch all sessions
      const sessionsRes = await fetch(`/api/sessions?outlet_id=${outletId}`);
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions ? sessionsData.sessions : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetching(false);
    }
  }

  function handleSessionCreated(session: DailySession) {
    setSessions([session, ...sessions]);
    setSessionId(session.id);
  }

  function handleSessionUpdated(updatedSession: DailySession) {
    setSessions(
      sessions.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  }

  function handleTutupBukuSuccess() {
    // Show success message
    alert('✅ Periode berhasil ditutup. Sesi terkunci dan periode baru sudah dibuat.');
    // Refresh data
    fetchData();
    // Switch to historical tab
    setActiveTab('historical');
  }

  if (fetching) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sesi Harian</h1>
          <p className="text-gray-600">Memuat...</p>
        </div>
        <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sesi Harian</h1>
        <p className="text-gray-600">Kelola sesi harian dan tutup buku periode</p>
      </div>

      {/* Period Info Banner */}
      <PeriodInfoBanner 
        outletId={outletId}
        onTutupBukuClick={() => period && setTutupBukuModalOpen(true)}
      />

      {/* Tutup Buku Modal */}
      {period && (
        <TutupBukuModal
          open={tutupBukuModalOpen}
          onOpenChange={setTutupBukuModalOpen}
          periodId={period.id}
          periodMonth={period.period_month}
          outletId={outletId}
          onSuccess={handleTutupBukuSuccess}
        />
      )}

      {/* Tabs: Active & Historical */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">
            🟢 Sesi Aktif ({sessions.filter((s) => !s.is_locked).length})
          </TabsTrigger>
          <TabsTrigger value="historical">
            🔒 Historis ({sessions.filter((s) => s.is_locked).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveSessionsTab
            outletId={outletId}
            periodId={period?.id || ''}
            periodLocked={period?.is_locked || false}
            sessions={sessions}
            onSessionCreated={handleSessionCreated}
            onSessionUpdated={handleSessionUpdated}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="historical">
          <HistoricalSessionsTab sessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
