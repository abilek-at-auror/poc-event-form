const BASE_URL = 'http://localhost:3001/api';

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(config: RequestConfig): Promise<T> {
  const { url, method = 'GET', data, params, headers, signal } = config;
  
  // Build URL with query parameters
  const fullUrl = new URL(url, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, value);
    });
  }

  // Prepare request options
  const options: RequestInit = {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add body for non-GET requests
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(fullUrl.toString(), options);

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors, aborted requests, etc.
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// Main API client for Orval
export const apiClient = <T>(config: RequestConfig): Promise<T> => {
  return request<T>(config);
};

// Convenience methods for direct use
export const api = {
  get: <T>(url: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> =>
    request<T>({ url, method: 'GET', params, signal }),

  post: <T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    request<T>({ url, method: 'POST', data, signal }),

  patch: <T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    request<T>({ url, method: 'PATCH', data, signal }),

  put: <T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    request<T>({ url, method: 'PUT', data, signal }),

  delete: <T>(url: string, signal?: AbortSignal): Promise<T> =>
    request<T>({ url, method: 'DELETE', signal }),
};

export { ApiError };
