import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import type { Business, Sale, Debt, InventoryItem } from '@/types'

interface Cache<T> { data: T[]; at: number }

interface AppStore {
  // Auth
  session: Session | null
  setSession: (s: Session | null) => void

  // Active business
  activeBusiness: Business | null
  setActiveBusiness: (b: Business | null) => void

  // All user businesses (for switcher in settings)
  businesses: Business[]
  setBusinesses: (b: Business[]) => void

  // Gemini API key — local only, never sent to Supabase
  apiKey: string
  setApiKey: (k: string) => void

  // In-memory data cache (not persisted — survives tab switches, cleared on mutation)
  salesCache: Cache<Sale> | null
  setSalesCache: (c: Cache<Sale> | null) => void
  debtsCache: Cache<Debt> | null
  setDebtsCache: (c: Cache<Debt> | null) => void
  inventoryCache: Cache<InventoryItem> | null
  setInventoryCache: (c: Cache<InventoryItem> | null) => void
  clearCache: () => void
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),

      activeBusiness: null,
      setActiveBusiness: (activeBusiness) => set({ activeBusiness }),

      businesses: [],
      setBusinesses: (businesses) => set({ businesses }),

      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),

      salesCache: null,
      setSalesCache: (salesCache) => set({ salesCache }),
      debtsCache: null,
      setDebtsCache: (debtsCache) => set({ debtsCache }),
      inventoryCache: null,
      setInventoryCache: (inventoryCache) => set({ inventoryCache }),
      clearCache: () => set({ salesCache: null, debtsCache: null, inventoryCache: null }),
    }),
    {
      name: 'soko-store',
      storage: createJSONStorage(() => AsyncStorage),
      // session re-hydrated by Supabase's own persistence
      // cache is intentionally excluded — it's in-memory only
      partialize: (s) => ({ activeBusiness: s.activeBusiness, apiKey: s.apiKey }),
    }
  )
)
