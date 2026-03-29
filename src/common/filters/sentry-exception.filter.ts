import { Catch, ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response, Request } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    Sentry.withScope((scope) => {
      scope.setTag('channel', (request.headers['x-channel'] as string) ?? 'unknown');
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        requestId: request.headers['x-request-id'] as string,
      });
      // DO NOT include request body — may contain customer messages
      Sentry.captureException(exception);
    });

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    response.status(status).json({
      statusCode: status,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    });
  }
}
