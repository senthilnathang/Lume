import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load backend/.env so integration suites can reach the dev database.
// Explicit test secrets below still take precedence for auth isolation.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
  process.env.SESSION_SECRET = 'test-session-secret';
});
