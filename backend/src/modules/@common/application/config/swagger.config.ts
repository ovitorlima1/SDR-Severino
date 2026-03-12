import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SDR Severino API')
    .setDescription('Backend API para o sistema SDR Severino - Gestão de Leads de Energia')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Autenticação e autorização')
    .addTag('Clients', 'Gestão de clientes/leads de energia')
    .addTag('Campaigns', 'Gestão de campanhas')
    .addTag('Kommo', 'Integração com Kommo CRM')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
