import { AuthService } from '../../src/modules/auth/auth.service.js';
import { jwtUtil } from '../../src/shared/utils/index.js';

function makeDb(user) {
  const store = { user: { ...user } };
  return {
    store,
    user: {
      findUnique: async () => ({ ...store.user }),
      update: async ({ data }) => {
        Object.assign(store.user, data);
        return { ...store.user };
      },
    },
  };
}

describe('refresh token reuse detection', () => {
  test('rotates on valid use and accepts the new token', async () => {
    const first = jwtUtil.generateRefreshToken(9);
    const db = makeDb({ id: 9, email: 'a@x.com', role_id: 3, refresh_token: first });
    const svc = new AuthService(db);
    const res = await svc.refreshToken(first);
    expect(res.success).toBe(true);
    expect(db.store.user.refresh_token).not.toBe(first);
    const again = await svc.refreshToken(db.store.user.refresh_token);
    expect(again.success).toBe(true);
  });

  test('revokes the family when a rotated token is reused', async () => {
    const first = jwtUtil.generateRefreshToken(9);
    const db = makeDb({ id: 9, email: 'a@x.com', role_id: 3, refresh_token: first });
    const svc = new AuthService(db);
    const rotated = await svc.refreshToken(first);
    expect(rotated.success).toBe(true);
    const replay = await svc.refreshToken(first);
    expect(replay.success).toBe(false);
    expect(String(replay.error?.message || '')).toMatch(/reuse/i);
    expect(db.store.user.refresh_token).toBeNull();
  });

  test('rejects forged tokens without touching the session', async () => {
    const legit = jwtUtil.generateRefreshToken(9);
    const db = makeDb({ id: 9, email: 'a@x.com', role_id: 3, refresh_token: legit });
    const svc = new AuthService(db);
    const res = await svc.refreshToken(legit.slice(0, -2) + 'xx');
    expect(res.success).toBe(false);
    expect(db.store.user.refresh_token).toBe(legit);
  });
});
