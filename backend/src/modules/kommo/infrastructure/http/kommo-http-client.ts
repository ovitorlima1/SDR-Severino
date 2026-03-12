import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IKommoHttpClient } from '../../domain/services/kommo-http-client.interface';

@Injectable()
export class KommoHttpClient implements IKommoHttpClient {
  private readonly logger = new Logger(KommoHttpClient.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    const subdomain = this.configService.get<string>('KOMMO_SUBDOMAIN', 'billitecnologia');
    this.baseUrl = `https://${subdomain}.kommo.com`;
    this.token = this.configService.get<string>('KOMMO_TOKEN', '');
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Severino-Backend/1.0',
    };
  }

  async getLeads(params?: Record<string, string | number>): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v4/leads`, {
        headers: this.headers,
        params,
      }),
    );
    return response.data;
  }

  async getPipelines(): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v4/leads/pipelines`, {
        headers: this.headers,
      }),
    );
    return response.data;
  }

  async getContacts(params?: Record<string, string | number>): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v4/contacts`, {
        headers: this.headers,
        params,
      }),
    );
    return response.data;
  }

  async proxyRequest(path: string, method: string, params?: Record<string, string | number>, body?: any): Promise<any> {
    const url = `${this.baseUrl}/${path}`;
    this.logger.log(`Kommo proxy: ${method} ${url}`);

    const config = { headers: this.headers, params };
    let response: any;

    if (method === 'GET') {
      response = await firstValueFrom(this.httpService.get(url, config));
    } else if (method === 'POST') {
      response = await firstValueFrom(this.httpService.post(url, body, config));
    } else if (method === 'PATCH') {
      response = await firstValueFrom(this.httpService.patch(url, body, config));
    } else if (method === 'DELETE') {
      response = await firstValueFrom(this.httpService.delete(url, config));
    } else {
      response = await firstValueFrom(this.httpService.get(url, config));
    }

    return response.data;
  }
}
