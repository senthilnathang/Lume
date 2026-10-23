export interface JwtPayloadDto {
  sub: number;
  email: string;
  role_id: number;
  role_name: string;
  company_id?: number;
  iat?: number;
  exp?: number;
}
