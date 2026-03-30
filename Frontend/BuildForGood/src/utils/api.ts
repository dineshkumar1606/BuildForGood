export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Returns standard headers for every request.
 * Includes ngrok-skip-browser-warning so ngrok's interstitial page is bypassed.
 */
export function getHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${localStorage.getItem('token') ?? ''}`,
    'ngrok-skip-browser-warning': 'true',
  };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

/** Convenience wrapper around fetch that always injects the correct headers. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const contentType = options.method && options.method !== 'GET' ? true : false;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(contentType),
      ...(options.headers as Record<string, string> ?? {})
    }
  });
}
