import { Injectable, Inject } from '@nestjs/common';
import { IKommoHttpClient, KOMMO_HTTP_CLIENT } from '../../../domain/services/kommo-http-client.interface';

@Injectable()
export class FetchKommoLeadsUseCase {
  constructor(
    @Inject(KOMMO_HTTP_CLIENT)
    private kommoClient: IKommoHttpClient,
  ) {}

  async execute(params?: Record<string, string | number>): Promise<any> {
    return this.kommoClient.getLeads(params);
  }
}
