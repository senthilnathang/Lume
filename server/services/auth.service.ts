import { User } from '../models/index';
import { UserCompanyRole } from '../models/index';
import { PasswordHistory } from '../models/index';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { createAccessToken, createRefreshToken, verifyToken } from '../utils/jwt';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    username: string;
    full_name: string | null;
    is_superuser: boolean;
    current_company_id: number | null;
  };
  requires2FA?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  company_id?: number;
}

/**
 * Authenticate a user with email/username and password.
 */
export async function login(
  identifier: string,
  password: string,
  ipAddress?: string,
): Promise<LoginResult> {
  // Find user by email or username
  const user = await User.findOne({
    where: identifier.includes('@')
      ? { email: identifier }
      : { username: identifier },
  });

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' });
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Account is temporarily locked. Please try again later.',
    });
  }

  // Check if account is active
  if (!user.is_active) {
    throw createError({ statusCode: 403, statusMessage: 'Account is deactivated' });
  }

  // Verify password
  const valid = await verifyPassword(password, user.hashed_password);
  if (!valid) {
    await user.incrementFailedAttempts();
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' });
  }

  // Check if 2FA is required
  if (user.two_factor_enabled) {
    // Return partial response — client must complete 2FA
    return {
      accessToken: '',
      refreshToken: '',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        is_superuser: user.is_superuser,
        current_company_id: user.current_company_id,
      },
      requires2FA: true,
    };
  }

  // Record successful login
  await user.recordLogin(ipAddress);

  // Generate tokens
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    company_id: user.current_company_id,
  });

  const refreshToken = createRefreshToken({
    sub: user.id,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      is_superuser: user.is_superuser,
      current_company_id: user.current_company_id,
    },
  };
}

/**
 * Register a new user.
 */
export async function register(data: RegisterData): Promise<LoginResult> {
  // Validate password strength
  const passwordCheck = validatePasswordStrength(data.password);
  if (!passwordCheck.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: `Password too weak: ${passwordCheck.errors.join(', ')}`,
    });
  }

  // Check for existing user
  const existingEmail = await User.findOne({ where: { email: data.email } });
  if (existingEmail) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' });
  }

  const existingUsername = await User.findOne({ where: { username: data.username } });
  if (existingUsername) {
    throw createError({ statusCode: 409, statusMessage: 'Username already taken' });
  }

  // Hash password and create user
  const hashedPassword = await hashPassword(data.password);

  const user = await User.create({
    email: data.email,
    username: data.username,
    hashed_password: hashedPassword,
    full_name: data.full_name,
    current_company_id: data.company_id,
  });

  // Save initial password to history
  await PasswordHistory.create({
    user_id: user.id,
    password_hash: hashedPassword,
  } as any);

  // Generate tokens
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    company_id: user.current_company_id,
  });

  const refreshToken = createRefreshToken({ sub: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      is_superuser: user.is_superuser,
      current_company_id: user.current_company_id,
    },
  };
}

/**
 * Refresh an access token using a valid refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const payload = verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token' });
  }

  const user = await User.findByPk(payload.sub, {
    attributes: ['id', 'email', 'is_active', 'current_company_id'],
  });

  if (!user || !user.is_active) {
    throw createError({ statusCode: 401, statusMessage: 'User not found or inactive' });
  }

  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    company_id: user.current_company_id,
  });

  return { accessToken };
}

/**
 * Change password for an authenticated user.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, user.hashed_password);
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' });
  }

  // Validate new password strength
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: `Password too weak: ${passwordCheck.errors.join(', ')}`,
    });
  }

  // Check password history (prevent reuse)
  const historyCount = 5;
  const recentPasswords = await PasswordHistory.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: historyCount,
  });

  for (const entry of recentPasswords) {
    const reused = await verifyPassword(newPassword, entry.password_hash);
    if (reused) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot reuse any of your last ${historyCount} passwords`,
      });
    }
  }

  // Hash and save
  const hashedPassword = await hashPassword(newPassword);
  await user.update({
    hashed_password: hashedPassword,
    password_changed_at: new Date(),
    must_change_password: false,
  });

  // Add to history
  await PasswordHistory.create({
    user_id: userId,
    password_hash: hashedPassword,
  } as any);
}

/**
 * Switch the user's current company context.
 */
export async function switchCompany(
  userId: number,
  companyId: number,
): Promise<{ company_id: number; accessToken: string }> {
  // Verify user has access to this company
  const userCompanyRole = await UserCompanyRole.findOne({
    where: {
      user_id: userId,
      company_id: companyId,
      is_active: true,
    },
  });

  if (!userCompanyRole) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this company',
    });
  }

  // Update current company
  const user = await User.findByPk(userId);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  await user.update({ current_company_id: companyId });

  // Issue new access token with updated company
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    company_id: companyId,
  });

  return { company_id: companyId, accessToken };
}

/**
 * Get the current user's full profile with permissions.
 */
export async function getCurrentUser(userId: number) {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['hashed_password', 'two_factor_secret', 'backup_codes', 'email_verification_token'] },
    include: [
      { association: 'companyRoles', include: [{ association: 'company' }, { association: 'role' }] },
    ],
  });

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  return user;
}
