import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { EditorService } from '../services/editor.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateSnippetDto,
  UpdateSnippetDto,
  CreatePresetDto,
  UpdatePresetDto,
  CreateGlobalWidgetDto,
  UpdateGlobalWidgetDto,
  CreateNoteDto,
} from '../dtos';
import { Public, Permissions } from '@core/decorators';

@Controller('api/editor')
export class EditorController {
  constructor(private editorService: EditorService) {}

  // ─── Templates ───

  @Get('templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findAllTemplates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.editorService.findAllTemplates({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      category,
    });
  }

  @Get('templates/default')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async getDefaultTemplate() {
    return this.editorService.getDefaultTemplate();
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.findTemplateById(id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.editorService.createTemplate(dto);
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.edit')
  async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.editorService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.delete')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.deleteTemplate(id);
  }

  // ─── Snippets ───

  @Get('snippets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.snippet.read')
  async findAllSnippets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.editorService.findAllSnippets({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      category,
    });
  }

  @Get('snippets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.snippet.read')
  async findSnippetById(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.findSnippetById(id);
  }

  @Post('snippets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.snippet.create')
  async createSnippet(@Body() dto: CreateSnippetDto) {
    return this.editorService.createSnippet(dto);
  }

  @Put('snippets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.snippet.edit')
  async updateSnippet(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSnippetDto) {
    return this.editorService.updateSnippet(id, dto);
  }

  @Delete('snippets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.snippet.delete')
  async deleteSnippet(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.deleteSnippet(id);
  }

  // ─── Presets ───

  @Get('presets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findAllPresets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('blockType') blockType?: string,
  ) {
    if (blockType) {
      return this.editorService.findPresetsByBlockType(blockType);
    }

    return this.editorService.findAllPresets({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      blockType,
    });
  }

  @Get('presets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findPresetById(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.findPresetById(id);
  }

  @Post('presets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async createPreset(@Body() dto: CreatePresetDto) {
    return this.editorService.createPreset(dto);
  }

  @Put('presets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.edit')
  async updatePreset(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePresetDto) {
    return this.editorService.updatePreset(id, dto);
  }

  @Delete('presets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.delete')
  async deletePreset(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.deletePreset(id);
  }

  // ─── Global Widgets ───

  @Get('global-widgets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findAllGlobalWidgets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.editorService.findAllGlobalWidgets({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
    });
  }

  @Get('global-widgets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findGlobalWidgetById(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.findGlobalWidgetById(id);
  }

  @Post('global-widgets')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async createGlobalWidget(@Body() dto: CreateGlobalWidgetDto) {
    return this.editorService.createGlobalWidget(dto);
  }

  @Put('global-widgets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.edit')
  async updateGlobalWidget(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGlobalWidgetDto) {
    return this.editorService.updateGlobalWidget(id, dto);
  }

  @Delete('global-widgets/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.delete')
  async deleteGlobalWidget(@Param('id', ParseIntPipe) id: number) {
    return this.editorService.deleteGlobalWidget(id);
  }

  // ─── Notes / Collaboration ───

  @Get('notes/:pageId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.read')
  async findNotesByPage(@Param('pageId', ParseIntPipe) pageId: number) {
    return this.editorService.findNotesByPage(pageId);
  }

  @Post('notes')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async createNote(@Body() dto: CreateNoteDto) {
    return this.editorService.createNote(dto);
  }

  @Post('notes/:id/reply')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async replyToNote(@Param('id', ParseIntPipe) parentId: number, @Body() dto: CreateNoteDto) {
    return this.editorService.replyToNote(parentId, dto);
  }

  @Put('notes/:id/resolve')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.edit')
  async resolveNote(@Param('id', ParseIntPipe) noteId: number) {
    return this.editorService.resolveNote(noteId);
  }

  @Delete('notes/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.delete')
  async deleteNote(@Param('id', ParseIntPipe) noteId: number) {
    return this.editorService.deleteNote(noteId);
  }

  // ─── Seed ───

  @Post('seed')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('editor.template.create')
  async seedDefaultTemplates() {
    return this.editorService.seedDefaultTemplates();
  }
}
