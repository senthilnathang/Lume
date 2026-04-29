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
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentsDto } from '../dtos';
import { Public, Permissions, CurrentUser } from '@core/decorators';
import { ParseIntPipe } from '@nestjs/common';

@Controller('api/documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('documents.read')
  async getStats() {
    return this.documentsService.getStats();
  }

  @Get()
  @Public()
  async findAll(@Query() query: QueryDocumentsDto) {
    return this.documentsService.findAll(query);
  }

  @Get(':id')
  @Public()
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('documents.write')
  async create(@Body() createDto: CreateDocumentDto, @CurrentUser() user: any) {
    return this.documentsService.create(createDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('documents.write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('documents.delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.delete(id);
  }

  @Post(':id/download')
  @Public()
  async incrementDownloads(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.incrementDownloads(id);
  }
}
