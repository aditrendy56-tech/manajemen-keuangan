export const dynamic = 'force-dynamic'

import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ProfitLossReport } from '@/types';

function normalizeChannel(sale: any) {
  if (sale.channel_type === 'offline') return 'offline';
  if (sale.platform === 'shopeefood' || sale.channel === 'shopeefood') return 'shopeefood';
  if (sale.platform === 'gofood' || sale.channel === 'gofood') return 'gofood';
  return sale.channel || 'offline';
}

function getRecognizedSaleAmount(sale: any) {
  const netAmount = Number(sale.net_amount || 0);
  const refundAmount = Number(sale.refund_amount || 0);
  return Math.max(netAmount - refundAmount, 0);
}

function getRecognizedExpenseAmount(expense: any) {
  const amount = Number(expense.amount || 0);
  const refundAmount = Number(expense.refund_amount || 0);
  return Math.max(amount - refundAmount, 0);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const outletId = searchParams.get('outlet_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!outletId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'outlet_id, start_date, and end_date required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Get sales data (recognized by transaction date)
    const { data: sales } = await supabase.from('sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    // Get expenses data (recognized by transaction date)
    const { data: expenses } = await supabase.from('expenses')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Cash transactions for settlement basis
    const { data: cashTransactions } = await supabase.from('cash_transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // Calculate metrics
    const gross_revenue = (sales || []).reduce((sum: number, s: any) => sum + getRecognizedSaleAmount({ ...s, net_amount: s.gross_amount || 0 }), 0) || 0;
    const net_revenue = (sales || []).reduce((sum: number, s: any) => sum + getRecognizedSaleAmount(s), 0) || 0;
    const platform_fees = (sales || []).reduce((sum: number, s: any) => sum + (s.platform_fee || 0), 0) || 0;
    const onlineSales = (sales || []).filter((sale: any) => sale.channel_type === 'online' || sale.platform === 'shopeefood' || sale.platform === 'gofood');
    const totalCalculatedTotal = onlineSales.reduce((sum: number, sale: any) => sum + Number(sale.calculated_total ?? sale.gross_amount ?? 0), 0) || 0;
    const totalFeeAmount = onlineSales.reduce((sum: number, sale: any) => {
      const calculatedTotal = Number(sale.calculated_total ?? sale.gross_amount ?? 0);
      const feeAmount = Number(sale.fee_amount ?? (calculatedTotal - Number(sale.net_amount ?? 0)));
      return sum + feeAmount;
    }, 0) || 0;
    const totalFeePercentage = totalCalculatedTotal > 0 ? (totalFeeAmount / totalCalculatedTotal) * 100 : 0;
    const totalNetRevenue = onlineSales.reduce((sum: number, sale: any) => sum + Number(sale.net_amount || 0), 0) || 0;
    const transaction_details = (sales || []).map((sale: any) => {
      const calculatedTotal = Number(sale.calculated_total ?? sale.gross_amount ?? 0);
      const feeAmount = Number(sale.fee_amount ?? (calculatedTotal - Number(sale.net_amount ?? 0)));
      const feePercentage = calculatedTotal > 0 ? (feeAmount / calculatedTotal) * 100 : 0;
      const grossAmount = Number(sale.gross_amount ?? calculatedTotal ?? 0);
      const netAmount = Number(sale.net_amount ?? (grossAmount - feeAmount));

      return {
        id: sale.id,
        created_at: sale.created_at,
        channel: normalizeChannel(sale),
        platform: sale.platform || null,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        fee_percentage: feePercentage,
        platform_fee: Number(sale.platform_fee || 0),
        net_amount: netAmount,
        payment_method: sale.payment_method || null,
        payment_status: sale.payment_status || null,
      };
    });

    const byChannel = {
      shopeefood: { calculated_total: 0, fee_amount: 0, fee_percentage: 0, net_revenue: 0, sales_count: 0 },
      gofood: { calculated_total: 0, fee_amount: 0, fee_percentage: 0, net_revenue: 0, sales_count: 0 },
    };

    onlineSales.forEach((sale: any) => {
      const channel = sale.platform === 'shopeefood' || sale.channel === 'shopeefood' ? 'shopeefood' : 'gofood';
      if (!byChannel[channel]) return;

      const calculatedTotal = Number(sale.calculated_total ?? sale.gross_amount ?? 0);
      const feeAmount = Number(sale.fee_amount ?? (calculatedTotal - Number(sale.net_amount ?? 0)));
      const feePercentage = calculatedTotal > 0 ? (feeAmount / calculatedTotal) * 100 : 0;

      byChannel[channel].calculated_total += calculatedTotal;
      byChannel[channel].fee_amount += feeAmount;
      byChannel[channel].fee_percentage += feePercentage;
      byChannel[channel].net_revenue += Number(sale.net_amount || 0);
      byChannel[channel].sales_count += 1;
    });

    Object.values(byChannel).forEach((channelData) => {
      channelData.fee_percentage = channelData.calculated_total > 0
        ? (channelData.fee_amount / channelData.calculated_total) * 100
        : 0;
    });
    const settled_cash_inflow = cashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'inflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;
    const settled_cash_outflow = cashTransactions?.reduce(
      (sum: number, tx: any) => sum + (tx.transaction_type === 'outflow' ? (tx.amount || 0) : 0),
      0
    ) || 0;

    // Expenses by category
    const expenses_by_category: Record<string, number> = {};
    let total_expenses = 0;

    (expenses || []).forEach((expense: any) => {
      const recognizedAmount = getRecognizedExpenseAmount(expense);
      expenses_by_category[expense.category] =
        (expenses_by_category[expense.category] || 0) + recognizedAmount;
      total_expenses += recognizedAmount;
    });

    const pending_sales_amount = (sales || []).reduce(
      (sum: number, s: any) => sum + (String(s.payment_status || '').toLowerCase() === 'settled' ? 0 : getRecognizedSaleAmount(s)),
      0
    ) || 0;

    const pending_expenses_amount = (expenses || []).reduce(
      (sum: number, e: any) => sum + (String(e.payment_status || '').toLowerCase() === 'paid' ? 0 : getRecognizedExpenseAmount(e)),
      0
    ) || 0;

    const gross_profit = net_revenue - total_expenses;
    const profit_margin = gross_revenue > 0 ? (gross_profit / gross_revenue) * 100 : 0;

    const report: ProfitLossReport = {
      gross_revenue,
      platform_fees,
      net_revenue,
      total_expenses,
      expenses_by_category,
      gross_profit,
      net_profit: gross_profit,
      profit_margin,
      recognized_gross_revenue: gross_revenue,
      recognized_net_revenue: net_revenue,
      settled_cash_inflow,
      settled_cash_outflow,
      pending_sales_amount,
      pending_expenses_amount,
      cash_basis_profit: settled_cash_inflow - settled_cash_outflow,
      transaction_details,
      online_fee_analysis: {
        total_calculated_total: totalCalculatedTotal,
        total_fee_amount: totalFeeAmount,
        total_fee_percentage: totalFeePercentage,
        total_net_revenue: totalNetRevenue,
        online_sales_count: onlineSales.length,
        by_channel: byChannel,
      },
    };

    // Revenue by channel
    const revenueByChannel = { offline: 0, shopeefood: 0, gofood: 0 };
    (sales || []).forEach((s: any) => {
      const channel = normalizeChannel(s);
      const recognizedGross = getRecognizedSaleAmount({ ...s, net_amount: s.gross_amount || 0 });
      if (channel === 'offline') revenueByChannel.offline += recognizedGross;
      else if (channel === 'shopeefood') revenueByChannel.shopeefood += recognizedGross;
      else if (channel === 'gofood') revenueByChannel.gofood += recognizedGross;
    });

    // Payment method
    const paymentMethod = { cash: 0, qris: 0 };
    (sales || []).forEach((s: any) => {
      const recognizedGross = getRecognizedSaleAmount({ ...s, net_amount: s.gross_amount || 0 });
      if (s.payment_method === 'cash') paymentMethod.cash += recognizedGross;
      else if (s.payment_method === 'qris') paymentMethod.qris += recognizedGross;
    });

    // Get sale items to count products
    const { data: saleItems } = await getSupabaseServer().from('sale_items')
      .select('product_id, quantity, products(name)')
      .in('sale_id', sales?.map((s: any) => s.id) || []);

    const productCounts: Record<string, { name: string; quantity: number }> = {};
    saleItems?.forEach((item: any) => {
      const productName = item.products?.name || 'Unknown';
      if (!productCounts[productName]) {
        productCounts[productName] = { name: productName, quantity: 0 };
      }
      productCounts[productName].quantity += item.quantity || 0;
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({ report, revenueByChannel, paymentMethod, topProducts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
