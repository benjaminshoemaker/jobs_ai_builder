import { expect, it } from 'vitest';
import { sameOrigin } from './request.js';
it('accepts the browser host behind Next local routing and rejects foreign or malformed origins', () => {
  expect(sameOrigin(new Request('http://localhost:8780/api/feedback', { headers: { host: '127.0.0.1:8780', origin: 'http://127.0.0.1:8780' } }))).toBe(true);
  for (const origin of ['https://foreign.example', 'null', 'http://127.0.0.1:8780/path']) expect(sameOrigin(new Request('http://localhost:8780/api/feedback', { headers: { host: '127.0.0.1:8780', origin } }))).toBe(false);
});
