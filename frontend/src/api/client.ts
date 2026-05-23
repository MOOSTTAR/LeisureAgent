const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const sp = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        sp.append(key, String(value))
      }
    }
  }
  const qs = sp.toString()
  return request<T>(`${url}${qs ? '?' + qs : ''}`)
}

export function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function put<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' })
}
