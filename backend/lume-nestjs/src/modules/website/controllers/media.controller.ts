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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { CurrentUser, Permissions } from '@core/decorators';
import { MediaService } from '../services/media.service';

@Controller('api/website')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  // Admin - get all media
  @Get('media')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.media.read')
  async findAll(@Query() query: any) {
    return this.mediaService.findAll({
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
      folder: query.folder,
      mimeType: query.mimeType,
    });
  }

  // Admin - upload single file
  @Post('media/upload')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.media.upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }
    return this.mediaService.uploadFile(file, user?.id);
  }

  // Admin - upload multiple files
  @Post('media/upload-multiple')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.media.upload')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    if (!files?.length) {
      return { success: false, error: 'No files provided' };
    }

    const results = [];
    for (const file of files) {
      const result = await this.mediaService.uploadFile(file, user?.id);
      if (result.success) results.push(result.data);
    }

    return {
      success: true,
      data: results,
      message: `${results.length} files uploaded`,
    };
  }

  // Admin - update media
  @Put('media/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.media.read')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.mediaService.update(parseInt(id), body);
  }

  // Admin - delete media
  @Delete('media/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.media.delete')
  async delete(@Param('id') id: string) {
    return this.mediaService.delete(parseInt(id));
  }
}
