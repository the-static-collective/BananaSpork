export type SupabasePublicEnv = Pick<
  ImportMetaEnv,
  'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY' | 'VITE_SUPABASE_ANON_KEY'
>;

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
  configured: boolean;
  issue?: string;
}

const runtimeEnv: Partial<SupabasePublicEnv> =
  (import.meta as unknown as { env?: Partial<SupabasePublicEnv> }).env ?? {};

function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function readSupabasePublicConfig(
  env: Partial<SupabasePublicEnv> = runtimeEnv
): SupabasePublicConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    env.VITE_SUPABASE_ANON_KEY?.trim() ??
    '';

  if (!url && !publishableKey) {
    return {
      url: '',
      publishableKey: '',
      configured: false,
      issue: 'Supabase public client configuration is not present.',
    };
  }

  if (!isValidHttpsUrl(url)) {
    return {
      url,
      publishableKey,
      configured: false,
      issue: 'VITE_SUPABASE_URL must be a valid HTTPS URL.',
    };
  }

  if (!publishableKey) {
    return {
      url,
      publishableKey,
      configured: false,
      issue: 'VITE_SUPABASE_PUBLISHABLE_KEY is not configured.',
    };
  }

  return { url, publishableKey, configured: true };
}

export const supabasePublicConfig = readSupabasePublicConfig();
