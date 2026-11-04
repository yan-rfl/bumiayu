export type UserRole = 'owner' | 'sales';
export type OrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type InvoicePaymentStatus = 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'GIRO';
export type ExpenseCategory = 'BBM' | 'PARKIR_RETRIBUSI' | 'REPARASI_ARMADA' | 'GAJI_BONUS' | 'OPERASIONAL_LAINNYA';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'PRINT' | 'SETTLEMENT' | 'STOCK_REFRESH';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  owner_name?: string;
  phone_wa: string;
  address: string;
  zone_code: string;
  top_days: number; // 0, 7, 14
  credit_limit: number;
  current_debt: number;
  is_locked: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BeatRouteSchedule {
  id: string;
  schedule_date: string;
  sales_id: string;
  zone_codes: string[];
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  base_unit: string; // 'PCS'
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  units?: ProductUnit[];
  current_stock?: number;
  snapshot_stock_h1?: number;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: 'PCS' | 'BD' | 'KTN' | string;
  conversion_qty: number; // PCS=1, BD=3, KTN=variatif
  purchase_price: number;
  price_grosir: number;
  price_ecer: number;
  is_default_sales: boolean;
}

export interface SalesOrderItem {
  id?: string;
  sales_order_id?: string;
  product_id: string;
  product_unit_id: string;
  product_name?: string;
  unit_name: string;
  quantity: number;
  original_quantity?: number;
  conversion_qty: number;
  unit_price: number;
  total_price: number;
}

export interface SalesOrder {
  id: string;
  order_no: string;
  store_id: string;
  sales_id: string;
  order_date: string;
  delivery_date: string;
  status: OrderStatus;
  hold_reason?: string;
  bypass_token?: string;
  subtotal: number;
  grand_total: number;
  is_edited_by_admin: boolean;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
  store?: Store;
  sales?: Profile;
}

export interface SalesInvoice {
  id: string;
  invoice_no: string;
  sales_order_id: string;
  store_id: string;
  sales_id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: InvoicePaymentStatus;
  printed_count: number;
  last_printed_at?: string;
  last_printed_by?: string;
  created_at: string;
  store?: Store;
}

export interface Payment {
  id: string;
  payment_no: string;
  invoice_id: string;
  store_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  verified_by: string;
  notes?: string;
  created_at: string;
}

export interface OperationalExpense {
  id: string;
  expense_no: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  claimed_by: string;
  is_verified: boolean;
  verified_by?: string;
  created_at: string;
}

export interface AuditTrail {
  id: string;
  timestamp: string;
  user_id: string;
  action_type: AuditAction;
  module: string;
  record_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  notes?: string;
}
