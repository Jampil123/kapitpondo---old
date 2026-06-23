// apps/mobile/src/lib/api.ts
// Calls the KapitPondo Node backend, automatically attaching the logged-in
// user's Supabase access token.

import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string; // e.g. http://localhost:4000/api

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T = any>(method: Method, path: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};