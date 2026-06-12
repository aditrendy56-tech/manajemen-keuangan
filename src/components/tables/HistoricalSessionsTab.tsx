'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DailySession } from '@/types';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoricalSessionsTabProps {
  sessions: DailySession[];
}

export function HistoricalSessionsTab({ sessions }: HistoricalSessionsTabProps) {
  const historicalSessions = sessions.filter((s) => s.is_locked);

  // Group sessions by period_month for better organization
  const groupedByPeriod = historicalSessions.reduce(
    (acc, session) => {
      const period = session.period_end_date?.substring(0, 7) || 'unknown';
      if (!acc[period]) acc[period] = [];
      acc[period].push(session);
      return acc;
    },
    {} as Record<string, DailySession[]>
  );

  if (historicalSessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p className="mb-2">📁 Belum ada sesi historis</p>
            <p className="text-sm">Sesi akan muncul di sini setelah periode ditutup.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Lock className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          📚 Sesi historis bersifat read-only. Anda bisa melihat detail tetapi tidak bisa mengedit atau menghapus.
        </AlertDescription>
      </Alert>

      {Object.entries(groupedByPeriod).map(([period, periodSessions]) => (
        <div key={period}>
          <h3 className="text-lg font-bold mb-3 text-gray-700">Periode: {period}</h3>
          <div className="grid gap-2">
            {periodSessions.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center py-3 px-4 border rounded bg-gray-50 hover:bg-gray-100 opacity-75"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-700">{session.date}</p>
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

                  {/* Lock Info */}
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>
                      Terkunci: {session.locked_at
                        ? new Date(session.locked_at).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    🔒 Terkunci
                  </Badge>
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    <Button variant="outline" size="sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary Stats */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Statistik Historis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Sesi Terkunci</p>
              <p className="text-2xl font-bold">{historicalSessions.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue Historis</p>
              <p className="text-2xl font-bold">
                Rp{' '}
                {historicalSessions
                  .reduce((sum, s) => sum + (s.total_revenue || 0), 0)
                  .toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
