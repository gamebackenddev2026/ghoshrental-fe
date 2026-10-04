import { API_ORIGIN } from "@/lib/config";

export type ApiResponse<T> = {
  code: number;
  message?: string;
  result: T;
};

type RequestOptions = {
  token?: string;
  headers?: Record<string, string>;
  // Matches Angular DataService's stateless GET/POST semantics: never cache by default.
  revalidate?: number | false;
  signal?: AbortSignal;
};

/** `${API_ORIGIN}/api/...` — same target in server components and the browser. */
function toAbsoluteApiUrl(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return new URL(path, `${API_ORIGIN}/`).href;
}

/**
 * Central POST helper that mirrors DataService.http.post(endpoint, data) from
 * the Angular app. Executes against `NEXT_PUBLIC_API_BASE_URL` (see
 * lib/config.ts; defaults to https://www.ghostrentals.com), so it works
 * identically from server components, route handlers, and the browser.
 * Authorization header parity with Angular's getRequestHeaders() is provided
 * through the `token` option.
 */
export async function apiPost<T>(
  endpoint: string,
  payload: unknown = {},
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = toAbsoluteApiUrl(endpoint);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const init: RequestInit & { next?: { revalidate?: number | false } } = {
    method: "POST",
    headers,
    body: JSON.stringify(payload ?? {}),
    signal: options.signal,
  };

  if (options.revalidate === undefined) {
    init.cache = "no-store";
  } else if (options.revalidate === false) {
    init.cache = "no-store";
  } else {
    init.next = { revalidate: options.revalidate };
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let backendMessage: string | undefined;
    try {
      const errBody = (await response.json()) as Record<string, unknown>;
      backendMessage =
        typeof errBody.message === "string" ? errBody.message : undefined;
    } catch {
      // ignore — response body may not be JSON
    }
    throw new ApiError(
      backendMessage ?? `API ${endpoint} failed with ${response.status}`,
      response.status,
      endpoint,
    );
  }

  const data = (await response.json()) as ApiResponse<T>;
  return data;
}

/**
 * GET helper for endpoints that expose read-only resources without a POST body
 * (e.g. `/api/socialPost/getSocialPosts`).
 */
export async function apiGet<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = toAbsoluteApiUrl(endpoint);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const init: RequestInit & { next?: { revalidate?: number | false } } = {
    method: "GET",
    headers,
    signal: options.signal,
  };

  if (options.revalidate === undefined) {
    init.cache = "no-store";
  } else if (options.revalidate === false) {
    init.cache = "no-store";
  } else {
    init.next = { revalidate: options.revalidate };
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let backendMessage: string | undefined;
    try {
      const errBody = (await response.json()) as Record<string, unknown>;
      backendMessage =
        typeof errBody.message === "string" ? errBody.message : undefined;
    } catch {
      // ignore — response body may not be JSON
    }
    throw new ApiError(
      backendMessage ?? `API ${endpoint} failed with ${response.status}`,
      response.status,
      endpoint,
    );
  }

  const data = (await response.json()) as ApiResponse<T>;
  return data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Small helper that protects server components from a single failing upstream
 * call taking down the whole page. Mirrors Angular's catchError → fallback
 * behavior and logs the failure server-side for observability.
 */
export async function safeApiCall<T>(
  label: string,
  call: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[api:${label}] falling back →`, error);
    }
    return fallback;
  }
}
