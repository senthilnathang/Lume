import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger();

  debug(message: string, context?: string) {
    this.logger.debug(message, context || 'Lume');
  }

  log(message: string, context?: string) {
    this.logger.log(message, context || 'Lume');
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context || 'Lume');
  }

  error(message: string, context?: string, trace?: string) {
    this.logger.error(message, trace, context || 'Lume');
  }

  verbose(message: string, context?: string) {
    if (process.env.LOG_LEVEL === 'verbose') {
      this.logger.log(`[VERBOSE] ${message}`, context || 'Lume');
    }
  }

  getLogger(context: string): Logger {
    return new Logger(context);
  }
}
