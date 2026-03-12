import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KommoController } from './presentation/controllers/kommo.controller';
import { FetchKommoLeadsUseCase } from './application/use-cases/fetch-leads/fetch-kommo-leads.use-case';
import { FetchKommoStagesUseCase } from './application/use-cases/fetch-stages/fetch-kommo-stages.use-case';
import { KommoHttpClient } from './infrastructure/http/kommo-http-client';
import { KOMMO_HTTP_CLIENT } from './domain/services/kommo-http-client.interface';

@Module({
  imports: [HttpModule],
  controllers: [KommoController],
  providers: [
    FetchKommoLeadsUseCase,
    FetchKommoStagesUseCase,
    KommoHttpClient,
    { provide: KOMMO_HTTP_CLIENT, useClass: KommoHttpClient },
  ],
})
export class KommoModule {}
