import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabasePublicConfig } from './config';

// Keep a non-networking placeholder client available so local-only mode can load
// the same modules without throwing during import. Calls are gated by
// supabasePublicConfig.configured before they reach this client.
const clientUrl = supabasePublicConfig.url || 'https://not-configured.invalid';
const clientKey = supabasePublicConfig.publishableKey || 'not-configured';

export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
