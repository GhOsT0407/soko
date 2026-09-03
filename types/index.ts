export interface Business {
  id: string
  user_id: string
  name: string
  owner_name: string
  type: string
  created_at: string
}

export interface Sale {
  id: string
  business_id: string
  user_id: string
  item: string
  category: string
  qty: number
  price: number
  total: number
  customer: string
  is_debt: boolean
  notes: string
  created_at: string
}

export interface Debt {
  id: string
  business_id: string
  user_id: string
  sale_id: string | null
  customer: string
  phone: string
  amount: number
  amount_paid: number
  description: string
  due_date: string | null
  paid: boolean
  created_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  note: string
  created_at: string
}

export interface InventoryItem {
  id: string
  business_id: string
  user_id: string
  name: string
  category: string
  qty: number
  unit: string
  cost_price: number | null
  sell_price: number | null
  low_stock_threshold: number
  created_at: string
  updated_at: string
}
