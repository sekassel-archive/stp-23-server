import {NestFactory} from '@nestjs/core';
import {Transport} from '@nestjs/microservices';
import {NestExpressApplication} from '@nestjs/platform-express';
import {WsAdapter} from '@nestjs/platform-ws';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {readFile} from 'fs/promises';
import {AppModule} from './app.module';
import {environment} from './environment';
import {ErrorResponse, ValidationErrorResponse} from './util/error-response';
import {ThrottlerExceptionFilter} from './util/throttler-exception.filter';
import {Handlers} from '@sentry/node';

import './polyfills';

const globalPrefix = `api/${environment.version}`;

async function loadDescription(): Promise<string> {
  const contents$ = [
    'REST',
    'WebSocket',
    'UDPSocket',
    'Changelog',
  ].map(fileName => readFile(`docs/${fileName}.md`).then(content => {
    const replacedContent = content.toString()
      .replace(/\$\{environment\.(\w+)}/g, (fullMatch, key) => (environment as any)[key])
      .replace(/\$\{environment\.(\w+)\.(\w+)}/g, (fullMatch, category, key) => (environment as any)[category]?.[key]);
    return `
<details><summary>${fileName}</summary>

${replacedContent}

</details>
`;
  }));

  const descriptions = await Promise.all(contents$);
  return descriptions.join('\n');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  app.setGlobalPrefix(globalPrefix);
  app.enableCors();
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new ThrottlerExceptionFilter());
  app.use(Handlers.tracingHandler());

  app.connectMicroservice({
    transport: Transport.NATS,
    options: environment.nats,
  });

  const config = new DocumentBuilder()
    .setTitle('STP Server')
    .setDescription(await loadDescription())
    .setVersion(environment.version)
    .addServer(environment.baseUrl)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponse, ValidationErrorResponse],
  });
  SwaggerModule.setup(globalPrefix, app, document);

  await app.listen(environment.port);
  await app.startAllMicroservices();
}

bootstrap();
