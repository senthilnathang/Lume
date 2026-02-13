import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: number;
  type: 'access' | 'refresh';
  company_id?: number;
  iat?: number;
  exp?: number;
}

/**
 * Create a JWT access token.
 */
export function createAccessToken(
  userId: number,
  companyId?: number,
): string {
  const config = useRuntimeConfig();
  const expiresIn = config.accessTokenExpireMinutes * 60; // Convert minutes to seconds

  const payload: TokenPayload = {
    sub: userId,
    type: 'access',
    ...(companyId && { company_id: companyId }),
  };

  return jwt.sign(payload, config.jwtSecret, {
    algorithm: config.jwtAlgorithm as jwt.Algorithm,
    expiresIn,
  });
}

/**
 * Create a JWT refresh token.
 */
export function createRefreshToken(userId: number): string {
  const config = useRuntimeConfig();
  const expiresIn = config.refreshTokenExpireDays * 24 * 60 * 60; // Convert days to seconds

  const payload: TokenPayload = {
    sub: userId,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwtSecret, {
    algorithm: config.jwtAlgorithm as jwt.Algorithm,
    expiresIn,
  });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const config = useRuntimeConfig();
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: [config.jwtAlgorithm as jwt.Algorithm],
    }) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode a token without verification (for debugging).
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
