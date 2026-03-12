export interface IHttpClient {
  get<T>(url: string, config?: HttpConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: HttpConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: HttpConfig): Promise<T>;
  delete<T>(url: string, config?: HttpConfig): Promise<T>;
}

export interface HttpConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
}
