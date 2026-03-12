import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IHttpClient, HttpConfig } from './http-client.interface';

@Injectable()
export class AxiosHttpClient implements IHttpClient {
  private readonly logger = new Logger(AxiosHttpClient.name);

  constructor(private httpService: HttpService) {}

  async get<T>(url: string, config?: HttpConfig): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.get<T>(url, {
        headers: config?.headers,
        params: config?.params,
      }),
    );
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: HttpConfig): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.post<T>(url, data, {
        headers: config?.headers,
        params: config?.params,
      }),
    );
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: HttpConfig): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.put<T>(url, data, {
        headers: config?.headers,
        params: config?.params,
      }),
    );
    return response.data;
  }

  async delete<T>(url: string, config?: HttpConfig): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.delete<T>(url, {
        headers: config?.headers,
        params: config?.params,
      }),
    );
    return response.data;
  }
}
