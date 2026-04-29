import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AskQueryService, AskResult } from '@core/ai/ask-query.service';
import { CurrentUser } from '@core/decorators';
import { Public } from '@core/decorators/public.decorator';

export interface AskRequest {
  entity: string;
  question: string;
}

@Controller('api/ai')
export class AIController {
  constructor(private askQueryService: AskQueryService) {}

  @Post('ask')
  @Public()
  async ask(@Body() request: AskRequest, @CurrentUser() user?: any): Promise<AskResult> {
    const context = {
      userId: user?.id,
      roleId: user?.roleId,
      userRoles: user?.roles || [],
      metadata: { endpoint: 'ai.ask' },
    };

    return this.askQueryService.ask(request.entity, request.question, context);
  }
}
