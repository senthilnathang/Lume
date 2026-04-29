import { IsNumber, IsArray, IsNotEmpty } from 'class-validator';

export class AssignPermissionDto {
  @IsArray()
  @IsNotEmpty()
  permissionIds!: number[];
}
