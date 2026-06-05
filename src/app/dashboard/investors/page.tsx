'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';


export default function InvestorsPage() {
  useEffect(() => {
    // Redirect to funding page with role management tab
    redirect('/dashboard/funding?tab=kelola');
  }, []);

  return null;
}
