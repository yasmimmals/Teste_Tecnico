import type { EventType, Location, Status, Summary, Marking, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const token = {
  get: () => localStorage.getItem('token'),
  set: (t: string) => localStorage.setItem('token', t),
  clear: () => localStorage.removeItem('token'),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// o fastapi devolve string nos erros que eu lanço e uma lista nos erros de validação
function errorMessage(detail: any): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => String(d.msg).replace('Value error, ', '')).join(' ');
  return 'Algo deu errado, tente de novo.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const t = token.get();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Confira sua conexão.');
  }

  if (res.status === 401 && t) {
    token.clear();
    window.dispatchEvent(new Event('logout'));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorMessage(body.detail));
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username: email, password }),
    }),
  register: (data: { name: string; email: string; password: string; timezone: string }) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<User>('/auth/me'),
  updateMe: (data: { name?: string; timezone?: string }) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  users: () => request<User[]>('/auth/users'),

  status: () => request<Status>('/records/status'),
  mark: (event_type: EventType, timezone: string, location: Location | null, note?: string) =>
    request<Marking>('/records', {
      method: 'POST',
      body: JSON.stringify({ event_type, timezone, location, note: note || null }),
    }),
  summary: (start: string, end: string, userId?: number) => {
    const params = new URLSearchParams({ start, end });
    if (userId) params.set('user_id', String(userId));
    return request<Summary>('/records/summary?' + params);
  },
};
