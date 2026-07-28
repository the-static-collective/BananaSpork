import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const meta = (import.meta as any) || {};
const env = meta.env || {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || process?.env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || process?.env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
