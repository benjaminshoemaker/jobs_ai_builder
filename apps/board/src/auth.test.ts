import { afterEach, expect, it, vi } from 'vitest';
import { isAdmin } from './admin-authorization.js';
afterEach(() => vi.unstubAllEnvs());
it('requires a verified identity matching the explicit admin allowlist', () => {
  vi.stubEnv('BOARD_ADMIN_EMAIL', 'owner@example.com');
  expect(isAdmin({ email: 'owner@example.com', emailVerified: false })).toBe(false);
  expect(isAdmin({ email: 'other@example.com', emailVerified: true })).toBe(false);
  expect(isAdmin({ email: 'OWNER@example.com', emailVerified: true })).toBe(true);
  vi.stubEnv('BOARD_ADMIN_EMAIL', '');
  expect(isAdmin({ email: 'owner@example.com', emailVerified: true })).toBe(false);
});
it('allows a verified agent only on preview deployments', () => {
  vi.stubEnv('BOARD_ADMIN_EMAIL', 'owner@example.com');
  vi.stubEnv('BOARD_PREVIEW_AGENT_EMAIL', 'agent@example.com');
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(isAdmin({email: 'agent@example.com', emailVerified: true})).toBe(true);
  expect(isAdmin({email: 'agent@example.com', emailVerified: false})).toBe(false);
  expect(isAdmin({email: 'owner@example.com', emailVerified: true})).toBe(true);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect(isAdmin({email: 'agent@example.com', emailVerified: true})).toBe(false);
});
