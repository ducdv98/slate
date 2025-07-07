import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { ResponseInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Enhanced global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      // Security options
      whitelist: true, // Remove properties not defined in DTOs
      forbidNonWhitelisted: true, // Throw error for extra properties
      forbidUnknownValues: true, // Forbid unknown objects

      // Transformation options
      transform: true, // Automatically transform payloads
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert strings to numbers etc.
      },

      // Error handling options
      disableErrorMessages: false, // Include error messages in production
      validationError: {
        target: false, // Don't expose the whole object in errors
        value: false, // Don't expose the invalid value in errors
      },

      // Skip validation for missing properties marked as optional
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // Swagger configuration
  if (configService.get<string>('app.nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Slate API')
      .setDescription('The Slate project management API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Start server
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (configService.get<string>('app.nodeEnv') !== 'production') {
    console.log(
      `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
    );
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
