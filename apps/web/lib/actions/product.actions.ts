import { API_URL } from '../constants';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const productApi = {
  getAll: (query?: string) => apiFetch(`/products${query ? `?${query}` : ''}`),

  getById: (id: string) => apiFetch(`/products/${id}`),
};
