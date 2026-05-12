import type { BusinessTypeId, TeamSizeId, TrackingMethodId } from '@/constants/data'

export interface Profile {
  businessName: string
  ownerName: string
  businessType: BusinessTypeId | ''
  teamSize: TeamSizeId | ''
  trackingMethod: TrackingMethodId | ''
}

export interface Sale {
  id: string
  item: string
  category: string
  qty: number
  price: number
  total: number
  customer: string
  isDebt: boolean
  createdAt: string
  photos?: string[]
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  qty: number
  buyingPrice: number
  sellingPrice: number
  lowStockAt: number
  createdAt: string
}

export interface Debt {
  id: string
  customer: string
  phone: string
  amount: number
  description: string
  paid: boolean
  createdAt: string
}
