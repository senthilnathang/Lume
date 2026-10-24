export interface JwtPayloadDto {
  sub: number;
  sid?: string;
  token_use?: 'access' | 'refresh';
  email: string;
  role_id: number;
  role_name: string;
  company_id?: number;
  iat?: number;
  exp?: number;
}
