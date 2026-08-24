const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function getToken(): string | null {
  return localStorage.getItem('baseer_token');
}

export function setSession(token: string, role: string, name: string) {
  localStorage.setItem('baseer_token', token);
  localStorage.setItem('baseer_role', role);
  localStorage.setItem('baseer_name', name ?? '');
}

export function clearSession() {
  localStorage.removeItem('baseer_token');
  localStorage.removeItem('baseer_role');
  localStorage.removeItem('baseer_name');
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function reportUrl(path: string): string {
  return `${API_URL}${path}`;
}

export { API_URL };
