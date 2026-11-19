export type UserRole = 'superadmin' |'owner' | 'cashier';

export type OrderStatus = 'open' | 'paid' | 'debt' | 'void';
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debt';

export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  receipt_footer: string | null;
  is_active: boolean;
  plan_name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  pin_code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  company_id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  company_id: string;
  cashier_id: string;
  starting_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export interface Order {
  id: string;
  company_id: string;
  shift_id: string | null;
  cashier_id: string | null;
  customer_name: string;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total_amount: number;
  cash_received: number;
  change_amount: number;
  void_reason: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface OrderItem {
  id: string;
  company_id: string;
  order_id: string;
  menu_id: string | null;
  menu_name: string;
  price: number;
  quantity: number;
  notes: string | null;
  subtotal: number;
}

export interface Expense {
  id: string;
  company_id: string;
  shift_id: string | null;
  recorded_by: string | null;
  description: string;
  amount: number;
  created_at: string;
}