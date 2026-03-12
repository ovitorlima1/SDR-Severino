export const KOMMO_HTTP_CLIENT = 'KOMMO_HTTP_CLIENT';

export interface IKommoHttpClient {
  getLeads(params?: Record<string, string | number>): Promise<any>;
  getPipelines(): Promise<any>;
  getContacts(params?: Record<string, string | number>): Promise<any>;
  proxyRequest(path: string, method: string, params?: Record<string, string | number>, body?: any): Promise<any>;
}
