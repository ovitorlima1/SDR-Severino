import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class MainController {
  @Get('healthcheck')
  @ApiOperation({ summary: 'Health check do servidor' })
  @ApiResponse({ status: 200, description: 'Servidor saudável' })
  healthcheck() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'sdr-severino-backend' };
  }
}
