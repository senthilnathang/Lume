import { PartialType } from '@nestjs/mapped-types';
import { CreateGawdesySettingDto } from './create-gawdesy-setting.dto';

export class UpdateGawdesySettingDto extends PartialType(CreateGawdesySettingDto) {}
