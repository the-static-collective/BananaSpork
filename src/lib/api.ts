import { Capacitor } from '@capacitor/core';

export interface ApiRuntimeConfig {
  baseUrl: string;
  isNative: boolean;
  configured: boolean;
  issue?: string;
}

type ApiEnv = Pick<ImportMetaEnv, 'VITE_API_BASE_URL'>;

const runtimeEnv: Partial<ImportMetaEnv> =
  (import.meta as unknown as { env?: Partial<ImportMetaEnv> }).env ?? {};

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isAllowedBaseUrl(value: string, allowLocalhost: boolean): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return (
      allowLocalhost &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function readApiRuntimeConfig(
  env: Partial<ApiEnv> = runtimeEnv,
  isNative = Capacitor.isNativePlatform(),
  isDevelopment = Boolean(runtimeEnv.DEV)
): ApiRuntimeConfig {
  const baseUrl = normalizeBaseUrl(env.VITE_API_BASE_URL ?? '');

  if (!baseUrl) {
    if (isNative) {
      return {
        baseUrl: '',
        isNative,
        configured: false,
        issue:
          'Native AI features need VITE_API_BASE_URL set to the deployed HTTPS BananaGram API.',
      };
    }
    return { baseUrl: '', isNative, configured: true };
  }

  if (!isAllowedBaseUrl(baseUrl, isDevelopment && !isNative)) {
    return {
      baseUrl,
      isNative,
      configured: false,
      issue: 'VITE_API_BASE_URL must use HTTPS outside local web development.',
    };
  }

  return { baseUrl, isNative, configured: true };
}

export function resolveApiUrl(path: string, config = apiRuntimeConfig): string {
  if (!path.startsWith('/api/')) {
    throw new Error(`BananaGram API paths must begin with /api/: ${path}`);
  }
  if (!config.configured) {
    throw new Error(config.issue || 'BananaGram API is not configured.');
  }
  return config.baseUrl ? `${config.baseUrl}${path}` : path;
}

export class ApiResponseError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  config = apiRuntimeConfig
): Promise<T> {
  const response = await fetch(resolveApiUrl(path, config), init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `BananaGram API request failed with HTTP ${response.status}.`;
    throw new ApiResponseError(message, response.status, body);
  }

  return body as T;
}

export const apiRuntimeConfig = readApiRuntimeConfig();
