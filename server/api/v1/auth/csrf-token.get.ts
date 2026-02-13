import { generateCsrfToken } from '~/server/middleware/05.csrf';

export default defineEventHandler((event) => {
  const token = generateCsrfToken(event);
  return {
    success: true,
    data: { csrf_token: token },
  };
});
