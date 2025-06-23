import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ContractOperationError } from '../errors/ContractOperationError';
import { ProviderConnectionError } from '../errors/ProviderConnectionError';
import { PersistenceError } from '../errors/PersistenceError';
import { MissingConfigurationError } from '../errors/MissingConfigurationError';
import { AuctionListenerError } from '../errors/AuctionListenerError';
import { RetryFailedError } from '../errors/RetryFailedError';

interface ErrorConfig {
  status: HttpStatus;
  message?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly errorMappings = new Map<string, ErrorConfig>([
    [ContractOperationError.name, { status: HttpStatus.BAD_REQUEST }],
    [ProviderConnectionError.name, { status: HttpStatus.SERVICE_UNAVAILABLE }],
    [ForbiddenException.name, { status: HttpStatus.FORBIDDEN }],
    [PersistenceError.name, { status: HttpStatus.INTERNAL_SERVER_ERROR }],
    [MissingConfigurationError.name, { status: HttpStatus.INTERNAL_SERVER_ERROR }],
    [RetryFailedError.name, { status: HttpStatus.INTERNAL_SERVER_ERROR }],
    [AuctionListenerError.name, { status: HttpStatus.INTERNAL_SERVER_ERROR }],
  ]);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorInfo = this.getErrorInfo(exception);

    response.status(errorInfo.status).json({
      statusCode: errorInfo.status,
      message: errorInfo.message,
      errorType: errorInfo.errorType,
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorInfo(exception: unknown) {
    // Handle HttpException (includes NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.getResponse() as string,
        errorType: exception.constructor.name,
      };
    }

    // Handle custom errors using mapping
    if (exception instanceof Error) {
      const config = this.errorMappings.get(exception.constructor.name);
      if (config) {
        return {
          status: config.status,
          message: config.message || exception.message,
          errorType: exception.constructor.name,
        };
      }

      // Handle generic Error
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        errorType: exception.constructor.name,
      };
    }

    // Handle unknown exceptions
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorType: 'UnknownError',
    };
  }
}
