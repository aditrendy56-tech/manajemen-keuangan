'use client';

import { useState } from 'react';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { ExpensesTable } from '@/components/tables/ExpensesTable';
import { Expense } from '@/types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      session_id: 'session-1',
      outlet_id: 'outlet-1',
      date: new Date().toISOString().split('T')[0],
      category: 'operasional',
      description: 'Biaya listrik',
      amount: 50000,
      notes: 'Tagihan bulanan',
      created_at: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: any) {
    setLoading(true);
    try {
      const newExpense: Expense = {
        id: Math.random().toString(36),
        session_id: 'session-1',
        outlet_id: 'outlet-1',
        ...data,
        created_at: new Date().toISOString(),
      };
      setExpenses([newExpense, ...expenses]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengeluaran</h1>
        <p className="text-gray-600">Input dan kelola data pengeluaran</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExpensesTable expenses={expenses} />
        </div>
        <div>
          <ExpenseForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}