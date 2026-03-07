import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';

type ErrorBody = {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
};

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
  }
}

function normalizeMessage(input: unknown): { message: string; details?: unknown } {
  if (typeof input === 'string') return { message: input };

  if (input && typeof input === 'object') {
    const maybe = input as any;

    if (Array.isArray(maybe.message)) {
      return { message: 'Validation failed', details: maybe.message };
    }

    if (typeof maybe.message === 'string') {
      return { message: maybe.message, details: maybe.details };
    }

    return { message: 'Request failed', details: input };
  }

  return { message: 'Request failed' };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<any>();
    const req = ctx.getRequest<any>();

    const timestamp = new Date().toISOString();
    const path = req?.originalUrl || req?.url || '';

    // Log real exception for debugging
    try {
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const resp = exception.getResponse();
        console.error('[GlobalExceptionFilter]', { path, status, response: resp });
      } else if (exception instanceof ZodError) {
        console.error('[GlobalExceptionFilter]', {
          path,
          name: 'ZodError',
          issues: exception.issues,
        });
      } else if (exception instanceof Error) {
        console.error('[GlobalExceptionFilter]', {
          path,
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        });
      } else {
        console.error('[GlobalExceptionFilter]', { path, exception });
      }
    } catch {
      // ignore logging failures
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawResponse: unknown = 'Internal server error';

    // IMPORTANT: map Zod validation to 400
    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      rawResponse = {
        message: 'Validation failed',
        details: exception.issues,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      rawResponse = exception.getResponse();
    } else if (exception instanceof Error) {
      rawResponse = exception.message || 'Internal server error';
    }

    const { message, details } = normalizeMessage(rawResponse);

    const body: ErrorBody = {
      success: false,
      error: {
        statusCode: status,
        code: statusToCode(status),
        message: status >= 500 ? 'Internal server error' : message,
        ...(details !== undefined ? { details } : {}),
        path,
        timestamp,
      },
    };

    res.status(status).json(body);
  }
}
