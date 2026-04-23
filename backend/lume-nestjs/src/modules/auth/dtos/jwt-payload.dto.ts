export interface JwtPayloadDto {
  sub: number;
  email: string;
  role_id: number;
  role_name: string;
  iat?: number;
  exp?: number;
}
