import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Profile, Sale, InventoryItem, Debt } from '@/types'

interface AppStore {
  onboarded: boolean
  profile: Profile
  sales: Sale[]
  inventory: InventoryItem[]
  debts: Debt[]
  apiKey: string

  setOnboarded: (v: boolean) => void
  updateProfile: (data: Partial<Profile>) => void
  setApiKey: (key: string) => void

  addSale: (sale: Sale) => void
  addSales: (sales: Sale[]) => void
  deleteSale: (id: string) => void

  addInventoryItem: (item: InventoryItem) => void
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void
  deleteInventoryItem: (id: string) => void

  addDebt: (debt: Debt) => void
  markDebtPaid: (id: string) => void
  deleteDebt: (id: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      onboarded: false,
      profile: {
        businessName: '',
        ownerName: '',
        businessType: '',
        teamSize: '',
        trackingMethod: '',
      },
      sales: [],
      inventory: [],
      debts: [],
      apiKey: '',

      setOnboarded: (v) => set({ onboarded: v }),

      updateProfile: (data) =>
        set((s) => ({ profile: { ...s.profile, ...data } })),

      setApiKey: (key) => set({ apiKey: key }),

      addSale: (sale) =>
        set((s) => ({ sales: [sale, ...s.sales] })),

      addSales: (newSales) =>
        set((s) => ({
          sales: [...s.sales, ...newSales].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        })),

      deleteSale: (id) =>
        set((s) => ({ sales: s.sales.filter((x) => x.id !== id) })),

      addInventoryItem: (item) =>
        set((s) => ({ inventory: [...s.inventory, item] })),

      updateInventoryItem: (id, updates) =>
        set((s) => ({
          inventory: s.inventory.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      deleteInventoryItem: (id) =>
        set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) })),

      addDebt: (debt) =>
        set((s) => ({ debts: [debt, ...s.debts] })),

      markDebtPaid: (id) =>
        set((s) => ({
          debts: s.debts.map((d) => (d.id === id ? { ...d, paid: true } : d)),
        })),

      deleteDebt: (id) =>
        set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
    }),
    {
      name: 'soko-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
