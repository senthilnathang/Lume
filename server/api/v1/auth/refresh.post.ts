import { refreshAccessToken } from '~/server/services/auth.service';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const refreshToken = body.refreshToken || body.refresh_token;

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refresh token is required',
    });
  }

  const result = await refreshAccessToken(refreshToken);

  return {
    success: true,
    data: result,
  };
});
