import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalWidgetDto } from './create-global-widget.dto';

export class UpdateGlobalWidgetDto extends PartialType(CreateGlobalWidgetDto) {}
