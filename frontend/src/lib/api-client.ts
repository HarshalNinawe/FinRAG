// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── API Client ───────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = response.statusText;
    }

    const message =
      typeof detail === "object" &&
      detail !== null &&
      "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : `Request failed with status ${response.status}`;

    throw new ApiError(response.status, message, detail);
  }

  // 204 No Content → return undefined cast as T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Public Methods ───────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return request<T>(path, { ...init, method: "GET" });
  },

  post<T>(path: string, body: unknown, init?: Omit<RequestInit, "method" | "body">): Promise<T> {
    return request<T>(path, {
      ...init,
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
