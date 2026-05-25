export function calculateProfitMargin(grossProfit: number, grossRevenue: number): number {
  if (grossRevenue === 0) return 0;
  return (grossProfit / grossRevenue) * 100;
}

export function calculateGrossProfit(grossRevenue: number, totalExpenses: number): number {
  return grossRevenue - totalExpenses;
}
