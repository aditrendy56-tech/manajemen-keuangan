export function calculatePlatformFee(
  channelOrPlatform: 'offline' | 'online' | 'shopeefood' | 'gofood' | string,
  grossAmount: number
): number {
  switch (channelOrPlatform) {
    case 'offline':
      return 0;
    case 'shopeefood':
      return grossAmount * 0.2;
    case 'gofood':
      return grossAmount * 0.25;
    case 'online':
      return 0;
    default:
      return 0;
  }
}

export function calculateNetAmount(
  grossAmount: number,
  platformFee: number
): number {
  return grossAmount - platformFee;
}

import { getSupabaseServer } from '@/lib/supabase/server';

export async function calculatePlatformFeeServer(
  channelOrPlatform: 'offline' | 'online' | 'shopeefood' | 'gofood' | string,
  grossAmount: number,
  outletId?: string | null
): Promise<number> {
  try {
    if (!outletId) {
      // fallback to default behaviour
      return calculatePlatformFee(channelOrPlatform, grossAmount);
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from('outlet_settings').select('fee_shopeefood, fee_gofood').eq('outlet_id', outletId).maybeSingle();
    if (error) throw error;

    const feeShopee = data?.fee_shopeefood ?? 0.2;
    const feeGofood = data?.fee_gofood ?? 0.25;

    switch (channelOrPlatform) {
      case 'offline':
        return 0;
      case 'shopeefood':
        return grossAmount * Number(feeShopee || 0);
      case 'gofood':
        return grossAmount * Number(feeGofood || 0);
      case 'online':
        return 0;
      default:
        return 0;
    }
  } catch (err) {
    // On any error, fallback to default calc
    return calculatePlatformFee(channelOrPlatform, grossAmount);
  }
}
