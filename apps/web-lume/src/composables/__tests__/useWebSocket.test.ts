import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWebSocket } from '../useWebSocket';

describe('WebSocket endpoint configuration', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

  it.each([
    ['https://api.example.test/api', '', 'wss://api.example.test/ws'],
    ['/api', '', 'ws://localhost:3000/ws'],
    ['https://api.example.test/api', 'wss://events.example.test/live', 'wss://events.example.test/live'],
  ])('connects using API %s and override %s', (api, override, expected) => {
    vi.stubEnv('VITE_API_URL', api);
    vi.stubEnv('VITE_WS_URL', override);
    localStorage.setItem('token', 'a+b&c');
    const connected = vi.fn();
    class Socket {
      static OPEN = 1;
      static CONNECTING = 0;
      readyState = 0;
      constructor(url: string) { connected(url); }
      close() {}
    }
    vi.stubGlobal('WebSocket', Socket);
    const wrapper = mount(defineComponent({ setup() { useWebSocket(); return () => h('div'); } }));
    try {
      const url = new URL(connected.mock.calls[0][0]);
      const origin = api === '/api' ? window.location.origin.replace(/^http/, 'ws') + '/ws' : expected;
      expect(url.origin + url.pathname).toBe(origin);
      expect(url.searchParams.get('token')).toBe('a+b&c');
    } finally { wrapper.unmount(); }
  });
});
