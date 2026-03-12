import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { FetchKommoLeadsUseCase } from '../../application/use-cases/fetch-leads/fetch-kommo-leads.use-case';
import { FetchKommoStagesUseCase } from '../../application/use-cases/fetch-stages/fetch-kommo-stages.use-case';
import { KommoHttpClient } from '../../infrastructure/http/kommo-http-client';

@ApiTags('Kommo')
@Controller('kommo')
export class KommoController {
  constructor(
    private fetchLeadsUseCase: FetchKommoLeadsUseCase,
    private fetchStagesUseCase: FetchKommoStagesUseCase,
    private kommoClient: KommoHttpClient,
  ) {}

  @All('proxy/*')
  @ApiOperation({ summary: 'Proxy genérico para Kommo API (substitui api/kommo.js)' })
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = (req.params as any)[0] || '';
    const { ...queryParams } = req.query as Record<string, string>;

    try {
      const data = await this.kommoClient.proxyRequest(
        path,
        req.method,
        queryParams as Record<string, string>,
        req.body,
      );
      return res.status(200).json(data);
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const data = error?.response?.data || { error: error.message };
      return res.status(status).json(data);
    }
  }
}
