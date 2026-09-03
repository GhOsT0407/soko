import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vbsgzcgofvmhpvgghbru.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_erza-yMjHxkS9ZpeSO6m3Q_KI9-_mTC'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
