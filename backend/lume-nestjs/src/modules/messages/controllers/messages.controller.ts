import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { MessagesService } from '../services/messages.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  QueryMessagesDto,
  ReplyMessageDto,
} from '../dtos';
import { Public, Permissions } from '@core/decorators';

@Controller('api/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.read')
  async getStats() {
    return this.messagesService.getStats();
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.read')
  async getByEmail(@Param('email') email: string) {
    return this.messagesService.getByEmail(email);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.read')
  async findAll(@Query() query: QueryMessagesDto) {
    return this.messagesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.read')
  async findById(@Param('id') id: string) {
    const result = await this.messagesService.findById(parseInt(id, 10));
    if (result.success && result.data?.status === 'new') {
      await this.messagesService.markAsRead(parseInt(id, 10));
    }
    return result;
  }

  @Post()
  @Public()
  async create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.write')
  async update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(parseInt(id, 10), dto);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.write')
  async markAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(parseInt(id, 10));
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.write')
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyMessageDto,
  ) {
    return this.messagesService.reply(parseInt(id, 10), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('messages.delete')
  async delete(@Param('id') id: string) {
    return this.messagesService.delete(parseInt(id, 10));
  }
}
