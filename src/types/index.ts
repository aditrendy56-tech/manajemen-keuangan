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
  // legacy single price (kept for backward compatibility)
  price?: number;
  // channel-specific gross prices
  price_offline?: number;
  price_shopeefood?: number;
  price_gofood?: number;
  // HPP Tracking (PHASE 2)
  cost_price?: number;
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
  source_type?: 'owner' | 'investor' | 'karyawan';
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
  source_type?: 'owner' | 'investor' | 'karyawan';
  priority_order?: number;
  notes?: string;
  created_at: string;
}

export interface InvestorRepayment {
  id: string;
  investor_id: string;
  amount: number;
  repayment_date: string;
  repayment_type?: 'lunas' | 'cicil';
  remaining_modal?: number | null;
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
  closed_at?: string | null;
  created_at: string;
}

// Discount Types (for online sales tracking)
export interface DiskonMenuItem {
  item_index: number;
  product_id: string;
  product_name: string;
  qty: number;
  price_normal: number;
  price_after_diskon: number;
}

export interface DiskonLangsung {
  urutan: number;
  amount: number;
  notes?: string;
}

export interface Sale {
  id: string;
  session_id: string;
  outlet_id: string;
  channel: 'offline' | 'shopeefood' | 'gofood';
  channel_type?: 'offline' | 'online';
  platform?: 'shopeefood' | 'gofood' | null;
  payment_method: 'cash' | 'qris' | 'split';
  gross_amount: number;
  calculated_total?: number | null;
  fee_amount?: number | null;
  fee_percentage?: number | null;
  platform_fee: number;
  net_amount: number;
  // HPP Tracking (PHASE 3)
  gross_profit?: number;
  payment_status?: 'settled' | 'pending' | 'refunded';
  settlement_date?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  refund_reference?: string | null;
  payment_entries?: Array<{
    payment_method: 'cash' | 'qris' | 'bank_transfer' | 'pending';
    amount: number;
    payment_status?: 'settled' | 'pending';
    settlement_date?: string | null;
    payment_reference?: string | null;
    notes?: string | null;
  }>;
  sale_items?: Array<{
    id?: string;
    product_id?: string | null;
    product_name?: string | null;
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
    cost_price?: number;
  }>;
  item_count?: number;
  order_ref?: string | null;
  notes?: string | null;
  // Custom Pricing Fields (NEW)
  type?: 'regular' | 'custom';
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | null;
  is_custom_price?: boolean;
  custom_original_price?: number | null;
  custom_final_price?: number | null;
  custom_description?: string | null;
  // Discount Tracking (NEW - for online sales analysis)
  diskon_menu_items?: DiskonMenuItem[] | null;
  diskon_langsung?: DiskonLangsung[] | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // HPP Tracking (PHASE 3)
  cost_price?: number;
  hpp_amount?: number;
  gross_profit?: number;
  profit_margin_percent?: number;
}

export interface Expense {
  id: string;
  session_id: string;
  outlet_id: string;
  date: string;
  category: 'bahan' | 'operasional' | 'peralatan';
  description: string;
  amount: number;
  funding_source?: 'kas' | 'modal';
  funded_by_investor_id?: string | null;
  payment_method?: 'cash' | 'qris' | 'bank_transfer' | 'pending';
  payment_status?: 'paid' | 'pending' | 'refunded';
  settlement_date?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  refund_reference?: string | null;
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
  session_id?: string | null;
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
  allocation_month?: string;
  profit_pending_amount?: number;
  profit_after_hutang?: number;
  total_employee_allocation?: number;
  kas_utama_topup?: number;
  simpan_uang_amount?: number;
  simpan_reason?: string;
  user_choice?: string;
  approval_status?: 'draft' | 'approved' | 'executed' | 'rejected' | 'amended' | string;
  approved_by?: string;
  approved_at?: string;
  profit_share_breakdown?: Array<{
    investor_id: string;
    investor_name: string;
    share_percent: number;
    share_amount: number;
  }>;
  notes?: string;
  amended_from_allocation_id?: string;
  amendment_reason?: string;
  period_label?: string;
  total_profit?: number;
  reserve_amount?: number;
  distributed_amount?: number;
  allocation_mode?: 'retain' | 'split' | 'full_distribution' | 'custom';
  reserve_label?: string;
  distribution_label?: string;
  created_at?: string;
}

export interface Stakeholder {
  id: string;
  outlet_id: string;
  name: string;
  role: 'founder' | 'owner' | 'investor' | 'employee' | 'karyawan' | 'other';
  investor_id?: string | null;
  default_share_percent: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface AllocationRule {
  id: string;
  outlet_id: string;
  name?: string;
  recover_first: boolean;
  cash_reserve_percent: number;
  allow_overdraft: boolean;
  notes?: string;
  created_at: string;
}

export interface AllocationRun {
  id: string;
  outlet_id: string;
  rule_id?: string | null;
  period_month: number;
  period_year: number;
  run_by?: string;
  status: 'dry' | 'executed';
  total_profit: number;
  total_allocated: number;
  notes?: string;
  created_at: string;
}

export interface AllocationItem {
  id: string;
  allocation_run_id: string;
  stakeholder_id?: string | null;
  item_type: 'reserve' | 'founder' | 'employee' | 'capital_recovery' | 'pool' | 'other';
  amount: number;
  notes?: string;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  outlet_id: string;
  transaction_date: string;
  transaction_type: 'inflow' | 'outflow';
  source_type: 'sale' | 'expense' | 'material_purchase' | 'capital_entry' | 'allocation' | 'repayment' | 'manual';
  source_id?: string | null;
  amount: number;
  description: string;
  notes?: string;
  created_at: string;
}

// UI/Form Types
export interface SaleFormData {
  channel_type: 'offline' | 'online';
  platform?: 'shopeefood' | 'gofood' | '';
  payment_method: 'cash' | 'qris' | 'split';
  payment_entries?: Array<{
    payment_method: 'cash' | 'qris' | 'bank_transfer' | 'pending';
    amount: number;
    payment_status?: 'settled' | 'pending';
    settlement_date?: string | null;
    payment_reference?: string | null;
    notes?: string | null;
  }>;
  items: { product_id: string; quantity: number }[];
  net_revenue?: number;
  calculated_total?: number;
  fee_amount?: number;
  fee_percentage?: number;
  notes?: string;
}

export interface ExpenseFormData {
  date: string;
  category: 'bahan' | 'operasional' | 'peralatan';
  description: string;
  amount: number;
  funding_source?: 'kas' | 'modal';
  funded_by_investor_id?: string | null;
  payment_method?: 'cash' | 'qris' | 'bank_transfer' | 'pending';
  payment_status?: 'paid' | 'pending' | 'refunded';
  settlement_date?: string;
  notes?: string;
}

// Report Types
export interface ProfitLossReport {
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  transaction_details?: Array<{
    id: string;
    created_at: string;
    channel: string;
    platform?: string | null;
    gross_amount: number;
    fee_amount: number;
    fee_percentage: number;
    platform_fee: number;
    net_amount: number;
    payment_method?: string | null;
    payment_status?: string | null;
    item_count?: number;
    item_names?: string;
    notes?: string | null;
  }>;
  expense_details?: Array<{
    id: string;
    date: string;
    category: string;
    description?: string | null;
    amount: number;
    refund_amount?: number;
    payment_status?: string | null;
    payment_method?: string | null;
    funding_source?: string | null;
    notes?: string | null;
  }>;
  online_fee_analysis?: {
    total_calculated_total: number;
    total_fee_amount: number;
    total_fee_percentage: number;
    total_net_revenue: number;
    online_sales_count: number;
    by_channel: Record<string, {
      calculated_total: number;
      fee_amount: number;
      fee_percentage: number;
      net_revenue: number;
      sales_count: number;
    }>;
  };
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  total_sales_count?: number;
  total_expense_count?: number;
  hpp?: number;
  operational_expenses?: number;
  daily_breakdown?: Array<{
    date: string;
    gross_revenue: number;
    platform_fees: number;
    net_revenue: number;
    hpp: number;
    operational_expenses: number;
    profit: number;
    item_count: number;
  }>;
  recognized_gross_revenue?: number;
  recognized_net_revenue?: number;
  settled_cash_inflow?: number;
  settled_cash_outflow?: number;
  pending_sales_amount?: number;
  pending_expenses_amount?: number;
  cash_basis_profit?: number;
}

export interface RevenueByChannel {
  offline: number;
  shopeefood: number;
  gofood: number;
}

export interface PaymentMethodBreakdown {
  cash: number;
  qris: number;
  split?: number;
}

export interface DashboardMetrics {
  // ===== TODAY (HARIAN) METRICS =====
  today_gross_revenue: number; // Kotor
  today_pendapatan_bersih: number; // Bersih (Kotor - HPP - Platform Fee)
  today_operational_expenses: number; // Operasional
  today_profit: number; // Profit (Bersih - Operasional)
  today_inventory_purchases?: number; // Inventory (not deducted from profit)
  today_total_items_sold?: number; // Total quantity of items sold (TODAY)
  today_revenue_by_channel?: {
    offline: number;
    shopeefood: number;
    gofood: number;
  };
  today_expense_by_category?: {
    bahan: number;
    operasional: number;
    peralatan: number;
  };
  today_payment_methods?: {
    cash: number;
    qris: number;
  };
  today_cash_inflow_by_channel?: {
    offline: number;
    shopeefood: number;
    gofood: number;
  };

  // ===== CUMULATIVE (TOTAL) METRICS =====
  cumulative_gross_revenue?: number; // Kotor (all time)
  cumulative_pendapatan_bersih?: number; // Bersih (all time)
  cumulative_operational_expenses?: number; // Operasional (all time)
  cumulative_profit?: number; // Profit (all time)
  cumulative_inventory_purchases?: number; // Inventory (all time)
  cumulative_total_items_sold?: number; // Total quantity of items sold (CUMULATIVE)
  cumulative_revenue_by_channel?: {
    offline: number;
    shopeefood: number;
    gofood: number;
  };
  cumulative_expense_by_category?: {
    bahan: number;
    operasional: number;
    peralatan: number;
  };

  // ===== CASH FLOW TRACKING =====
  cash_from_modal?: number; // Capital from investors
  cash_from_sales?: number; // Revenue from sales
  expense_from_kas?: number; // Expenses from sales revenue
  expense_from_modal?: number; // Expenses from investor capital
  available_for_distribution?: number; // Available profit after modal needs
  today_cash_inflow?: number;
  today_cash_outflow?: number;
  today_pending_sales?: number;
  today_pending_expenses?: number;
  cumulative_cash_inflow?: number;
  cumulative_cash_outflow?: number;

  // ===== KAS OPERASIONAL (Modal + Alokasi Profit - Pengeluaran) =====
  today_profit_allocated_to_kas?: number; // Profit allocated to kas operasional today
  cumulative_profit_allocated_to_kas?: number; // Cumulative profit allocated
  today_available_cash?: number; // Modal + Alokasi - Pengeluaran (TODAY)
  cumulative_available_cash?: number; // Modal + Alokasi - Pengeluaran (CUMULATIVE)

  // ===== SURPLUS/DEFICIT (Cash vs Profit) =====
  today_surplus_deficit?: number; // Available Cash - Profit (TODAY)
  cumulative_surplus_deficit?: number; // Available Cash - Profit (CUMULATIVE)

  // ===== HPP & PLATFORM FEE DETAILS =====
  today_total_hpp?: number; // Cost of Goods Sold (TODAY)
  cumulative_total_hpp?: number; // COGS (CUMULATIVE)
  today_total_platform_fee?: number; // Total platform fees (TODAY)
  cumulative_total_platform_fee?: number; // Total fees (CUMULATIVE)
  today_fee_shopeefood?: number; // ShopeeFood fee breakdown (TODAY)
  today_fee_gofood?: number; // GoFood fee breakdown (TODAY)
  cumulative_fee_shopeefood?: number; // ShopeeFood fee (CUMULATIVE)
  cumulative_fee_gofood?: number; // GoFood fee (CUMULATIVE)

  // ===== ANALYSIS =====
  top_products?: Array<{
    product_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  weekly_profit?: Array<{ date: string; profit: number; gross_revenue: number }>;

  // ===== DETAILED BREAKDOWNS FOR EXPANDABLE CARDS =====
  profit_detail?: {
    // Today breakdown
    today_gross_revenue?: number;
    today_pendapatan_bersih?: number;
    today_operational_expenses?: number;
    today_profit?: number;
    today_revenue_by_channel?: Record<string, number>;
    daily_expenses_detailed?: Array<{ description: string; amount: number; category: string }>;

    // Cumulative breakdown
    cumulative_gross_revenue?: number;
    cumulative_pendapatan_bersih?: number;
    cumulative_operational_expenses?: number;
    cumulative_profit?: number;
    cumulative_revenue_by_channel?: Record<string, number>;

    // Trends
    weekly_profit?: Array<{ date: string; profit: number; gross_revenue: number }>;
    average_daily_profit?: number;
  };

  // ===== CAPITAL ENTRIES =====
  capital_entries?: Array<{ id: string; source: string; amount: number; date: string }>;

  // ===== LEGACY/BACKWARD COMPAT (deprecated) =====
  today_net_revenue?: number; // Use today_pendapatan_bersih instead
  today_gross_profit?: number; // Deprecated (use today_profit)
  revenue_by_channel?: { offline: number; shopeefood: number; gofood: number };
  payment_methods?: { cash: number; qris: number };
  cash_inflow_by_channel?: { offline: number; shopeefood: number; gofood: number };
  expense_by_category?: { bahan: number; operasional: number; peralatan: number };
  total_profit_cumulative?: number; // Use cumulative_profit instead
}
