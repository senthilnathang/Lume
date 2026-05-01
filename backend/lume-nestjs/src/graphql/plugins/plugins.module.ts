import { Module } from '@nestjs/common';
import { TracingPlugin } from './tracing.plugin';
import { ComplexityPlugin } from './complexity.plugin';
import { LoggingPlugin } from './logging.plugin';

/**
 * GraphQL Plugins Module
 * Provides observability plugins for Apollo Server:
 * - TracingPlugin: OpenTelemetry spans per operation + field-level spans
 * - ComplexityPlugin: Query cost enforcement (QUERY_COMPLEXITY_EXCEEDED)
 * - LoggingPlugin: Structured JSON logging via LoggerService
 */
@Module({
  providers: [TracingPlugin, ComplexityPlugin, LoggingPlugin],
  exports: [TracingPlugin, ComplexityPlugin, LoggingPlugin],
})
export class PluginsModule {}
