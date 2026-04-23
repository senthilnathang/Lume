declare module 'passport-jwt' {
  export interface StrategyOptions {
    jwtFromRequest: (req: any) => string | null;
    secretOrKey?: string | Buffer;
    secretOrPublicKey?: string | Buffer;
    algorithms?: string[];
    audience?: string;
    issuer?: string;
    ignoreExpiration?: boolean;
    passReqToCallback?: boolean;
  }

  export interface VerifiedCallback {
    (err: Error | null, user?: any, info?: any): void;
  }

  export function ExtractJwt(): any;

  export namespace ExtractJwt {
    function fromAuthHeaderAsBearerToken(): (req: any) => string | null;
    function fromAuthHeaderWithScheme(auth_scheme: string): (req: any) => string | null;
    function fromExtractors(extractors: any[]): (req: any) => string | null;
    function fromUrlQueryParameter(param_name: string): (req: any) => string | null;
    function fromBodyField(field_name: string): (req: any) => string | null;
    function fromHeader(header_name: string): (req: any) => string | null;
    function fromCookie(cookie_name: string): (req: any) => string | null;
  }

  export class Strategy {
    constructor(options: StrategyOptions, verify: (payload: any, done: VerifiedCallback) => void);
    name: string;
  }
}
