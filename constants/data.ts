export type BusinessTypeId = 'trader' | 'artisan' | 'shop' | 'food' | 'beauty' | 'brand'
export type TeamSizeId = 'solo' | 'small' | 'medium' | 'large'
export type TrackingMethodId = 'notebook' | 'excel' | 'memory' | 'app'

export const BUSINESS_TYPES: {
  id: BusinessTypeId
  label: string
  emoji: string
  desc: string
}[] = [
  { id: 'trader', label: 'Market Trader', emoji: '🏪', desc: 'Fabric, food, goods' },
  { id: 'artisan', label: 'Artisan / Contractor', emoji: '🔧', desc: 'Electrician, plumber, tailor' },
  { id: 'shop', label: 'Shop / Provision Store', emoji: '🏬', desc: 'Retail, provisions, pharmacy' },
  { id: 'food', label: 'Food Business', emoji: '🍱', desc: 'Restaurant, catering, snacks' },
  { id: 'beauty', label: 'Beauty / Salon', emoji: '💅', desc: 'Hair, makeup, skincare' },
  { id: 'brand', label: 'Growing Brand / SME', emoji: '🚀', desc: 'Product line, wholesale' },
]

export const TEAM_SIZES: { id: TeamSizeId; label: string; emoji: string }[] = [
  { id: 'solo', label: 'Just me', emoji: '🧑' },
  { id: 'small', label: '2–5 people', emoji: '👥' },
  { id: 'medium', label: '6–15 people', emoji: '🏢' },
  { id: 'large', label: '15+ people', emoji: '🏗️' },
]

export const TRACKING_METHODS: { id: TrackingMethodId; label: string; emoji: string }[] = [
  { id: 'notebook', label: 'Notebook / Paper', emoji: '📒' },
  { id: 'excel', label: 'Excel / Google Sheets', emoji: '📊' },
  { id: 'memory', label: 'My head', emoji: '🧠' },
  { id: 'app', label: 'Another app', emoji: '📱' },
]

export const TAILORED: Record<
  BusinessTypeId,
  { greeting: string; inventoryLabel: string; saleLabel: string; customerLabel: string }
> = {
  trader: {
    greeting: 'Welcome, trader!',
    inventoryLabel: 'Stock Items',
    saleLabel: 'Record Sale',
    customerLabel: 'Customers',
  },
  artisan: {
    greeting: 'Ready to work!',
    inventoryLabel: 'Materials / Tools',
    saleLabel: 'Log a Job',
    customerLabel: 'Clients',
  },
  shop: {
    greeting: 'Open for business!',
    inventoryLabel: 'Shelf Items',
    saleLabel: 'Record Sale',
    customerLabel: 'Customers',
  },
  food: {
    greeting: "Let's cook up profit!",
    inventoryLabel: 'Ingredients / Menu',
    saleLabel: 'Record Order',
    customerLabel: 'Customers',
  },
  beauty: {
    greeting: 'Looking good!',
    inventoryLabel: 'Products / Services',
    saleLabel: 'Record Service',
    customerLabel: 'Clients',
  },
  brand: {
    greeting: 'Scale up!',
    inventoryLabel: 'Products / SKUs',
    saleLabel: 'Record Sale',
    customerLabel: 'Retailers',
  },
}

export const SALE_CATEGORIES: Record<BusinessTypeId, string[]> = {
  trader: ['Fabric', 'Ankara', 'Lace', 'Accessories', 'Other'],
  artisan: ['Electrical', 'Plumbing', 'Labour', 'Materials', 'Other'],
  shop: ['Provision', 'Drinks', 'Snacks', 'Household', 'Other'],
  food: ['Meal', 'Snack', 'Drinks', 'Catering', 'Other'],
  beauty: ['Hair', 'Makeup', 'Nails', 'Skincare', 'Other'],
  brand: ['Wholesale', 'Retail', 'Online', 'B2B Order', 'Other'],
}
