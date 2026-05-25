// Database Models
export interface Business {
  id: string;
  name: string;
  type: string;
  address?: string;
  owner_name?: string;
  created_at: string;
}

export interface Outlet {
  id: string;
  business_id: string;
  name: string;
  location?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  outlet_id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface RawMaterial {
  id: string;
  outlet_id: string;
  name: string;
  unit: string;
  price_per_unit: number;
}

export interface CapitalEntry {
  id: string;
  outlet_id: string;
  date: string;
  amount: number;
  source?: string;
  notes?: string;
  created_at: string;
}

export interface DailySession {
  id: string;
  outlet_id: string;
  date: string;
  opening_cash: number;
  closing_cash?: number | null;
  notes?: string | undefined;
  status: 'open' | 'closed';
  created_at: string;
}

export interface Sale {
  id: string;
  session_id: string;
  outlet_id: string;
  channel: 'offline' | 'shopeefood' | 'gofood';
  payment_method: 'cash' | 'qris';
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  order_ref?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  session_id: string;
  outlet_id: string;
  date: string;
  category: 'bahan_baku' | 'operasional' | 'transport' | 'peralatan' | 'lain_lain';
  description: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface MaterialPurchase {
  id: string;
  outlet_id: string;
  raw_material_id?: string;
  date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes?: string;
  created_at: string;
}

// UI/Form Types
export interface SaleFormData {
  channnel: 'offline' | 'shopeefood' | 'gofood';
  payment_method: 'cash' | 'qris';
  items: { product_id: string; quantity: number }[];
  notes?: string;
}

export interface ExpenseFormData {
  date: string;
  category: 'bahan_baku' | 'operasional' | 'transport' | 'peralatan' | 'lain_lain';
  description: string;
  amount: number;
  notes?: string;
}

// Report Types
export interface ProfitLossReport {
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  hpp?: number;
}

export interface RevenueByChannel {
  offline: number;
  shopeefood: number;
  gofood: number;
}

export interface PaymentMethodBreakdown {
  cash: number;
  qris: number;
}

export interface DashboardMetrics {
  today_gross_revenue: number;
  today_net_revenue: number;
  today_profit: number;
  revenue_by_channel: RevenueByChannel;
  payment_methods: PaymentMethodBreakdown;
  top_products: Array<{
    product_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  weekly_profit: Array<{ date: string; profit: number }>;
}
