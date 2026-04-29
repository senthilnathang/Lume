import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { QueueService } from '../services/queue.service';
import { AddJobDto, AddRecurringJobDto } from '../dtos';

@Controller('api/queue')
export class QueueController {
  constructor(private queueService: QueueService) {}

  /**
   * Get all queue statistics
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.read')
  async getAllStats() {
    try {
      return await this.queueService.getAllQueueStats();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get statistics for a specific queue
   */
  @Get(':queueName')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.read')
  async getQueueStats(@Param('queueName') queueName: string) {
    try {
      return await this.queueService.getQueueStats(queueName);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get job details
   */
  @Get(':queueName/:jobId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.read')
  async getJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    try {
      return await this.queueService.getJob(queueName, jobId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Clear a queue
   */
  @Post(':queueName/clear')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.write')
  async clearQueue(@Param('queueName') queueName: string) {
    try {
      return await this.queueService.clearQueue(queueName);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Add a job to a queue
   */
  @Post(':queueName/job')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.write')
  async addJob(@Param('queueName') queueName: string, @Body() dto: AddJobDto) {
    try {
      if (!dto.data) {
        throw new Error('Job data is required');
      }
      return await this.queueService.addJob(queueName, dto.data, dto.options || {});
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Add a recurring job
   */
  @Post(':queueName/recurring')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.write')
  async addRecurringJob(@Param('queueName') queueName: string, @Body() dto: AddRecurringJobDto) {
    try {
      if (!dto.jobName || !dto.data || !dto.pattern) {
        throw new Error('jobName, data, and pattern are required');
      }
      return await this.queueService.addRecurringJob(
        queueName,
        dto.jobName,
        dto.data,
        dto.pattern,
        dto.options || {},
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * List all queues
   */
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.queue.read')
  async listQueues() {
    try {
      return await this.queueService.getQueues();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
