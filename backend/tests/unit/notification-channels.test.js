import { NotificationService } from '../../src/core/services/notification.service.js';

function makeService({ emailImpl = null, smsImpl = null, userEmail = 'u@x.com' } = {}) {
  const store = { notifications: [], deliveries: [], seq: 1 };
  const svc = new NotificationService(
    { create: async (data) => {
      const row = { id: store.seq++, ...data };
      store.notifications.push(row);
      return row;
    } },
    null,
    { create: async (data) => {
      const row = { id: store.deliveries.length + 1, ...data };
      store.deliveries.push(row);
      return row;
    } },
    {
      userLookup: async () => ({ email: userEmail }),
      smsSender: smsImpl,
    }
  );
  if (emailImpl) {
    svc.emailOverride = emailImpl;
  }
  return { svc, store };
}

describe('notification multi-channel dispatch (FastVue port)', () => {
  test('in-app dispatch logs a sent delivery', async () => {
    const { svc, store } = makeService();
    const rec = await svc.dispatch(9, { title: 'Hi', message: 'there' });
    expect(rec.deliveries).toEqual({ in_app: 'sent' });
    expect(store.deliveries).toHaveLength(1);
  });

  test('email failures never fail the dispatch', async () => {
    const { svc, store } = makeService();
    const rec = await svc.dispatch(9, { title: 'Hi', message: 'there', channel: 'email' });
    expect(['sent', 'failed']).toContain(rec.deliveries.email);
    expect(store.deliveries.some((d) => d.channel === 'email')).toBe(true);
    expect(store.notifications).toHaveLength(1);
  });

  test('sms channel uses the injected sender and logs', async () => {
    const sent = [];
    const { svc } = makeService({ smsImpl: async (to, message) => { sent.push([to, message]); } });
    const rec = await svc.dispatch(9, { title: 'OTP', message: '1234', channel: 'sms', phone: '+10000000000' });
    expect(rec.deliveries.sms).toBe('sent');
    expect(sent).toHaveLength(1);
  });

  test('sms without a number logs failure, not a throw', async () => {
    const { svc } = makeService({ smsImpl: async () => {} });
    const rec = await svc.dispatch(9, { title: 'OTP', message: '1234', channel: 'sms' });
    expect(rec.deliveries.sms).toBe('failed');
  });
});
