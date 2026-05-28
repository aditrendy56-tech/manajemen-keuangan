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

export interface ModalItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  condition?: 'baik' | 'rusak' | 'habis';
}

export interface CapitalEntry {
  id: string;
  outlet_id: string;
  date: string;
  amount: number;
  source?: string;
  source_type?: 'owner' | 'investor';
  investor_id?: string | null;
  category?: 'peralatan' | 'bahan_awal' | 'rencana_tambahan';
  items?: ModalItem[];
  notes?: string;
  created_at: string;
}

export interface Investor {
  id: string;
  outlet_id: string;
  name: string;
  phone?: string;
  initial_contribution: number;
  remaining_balance: number;
  status: 'active' | 'settled' | 'partial';
  priority_order?: number;
  created_at: string;
}

export interface InvestorRepayment {
  id: string;
  investor_id: string;
  amount: number;
  repayment_date: string;
  method?: string;
  notes?: string;
  created_at: string;
}

// Alias for capital_repayments table
export type CapitalRepayment = InvestorRepayment;

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

export interface Supplier {
  id: string;
  outlet_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  opening_hours?: string;
  quality_rating?: number;
  reliability?: 'Good' | 'Excellent' | 'Poor';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPrice {
  id: string;
  supplier_id: string;
  raw_material_id: string;
  unit_price: number;
  minimum_order?: number;
  last_updated: string;
  is_current: boolean;
  notes?: string;
  created_at: string;
}

export interface MaterialPurchase {
  id: string;
  outlet_id: string;
  raw_material_id?: string;
  supplier_id?: string;
  date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  quality?: 'Baik' | 'Kurang' | 'Rusak';
  invoice_number?: string;
  payment_status?: 'Paid' | 'Pending' | 'Cicilan';
  delivery_date?: string;
  notes?: string;
  created_at: string;
}

export interface ProfitAllocation {
  id: string;
  outlet_id: string;
  allocation_date: string;
  period_label?: string;
  total_profit: number;
  reserve_amount: number;
  distributed_amount: number;
  allocation_mode: 'retain' | 'split' | 'full_distribution' | 'custom';
  reserve_label?: string;
  distribution_label?: string;
  notes?: string;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  outlet_id: string;
  transaction_date: string;
  transaction_type: 'inflow' | 'outflow';
  source_type: 'sale' | 'expense' | 'material_purchase' | 'capital_entry' | 'profit_allocation' | 'repayment' | 'manual';
  source_id?: string | null;
  amount: number;
  description: string;
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
