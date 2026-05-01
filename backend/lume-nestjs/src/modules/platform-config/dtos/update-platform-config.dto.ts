import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformConfigDto } from './create-platform-config.dto';

export class UpdatePlatformConfigDto extends PartialType(CreatePlatformConfigDto) {}
