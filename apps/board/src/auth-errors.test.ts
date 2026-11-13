import { expect, it } from 'vitest';
import { authErrorCode, authErrorMessage } from './auth-errors.js';
it('explains a rejected preview origin without exposing provider details or credentials', () => {
  expect(authErrorMessage({ code: 'INVALID_ORIGIN' })).toContain('preview URL');
  const error = { code: 'https://secret.example?token=private', message: 'sensitive upstream data' };
  expect(authErrorCode(error)).toBe('UNKNOWN');
  expect(authErrorMessage(error)).not.toContain('private');
  expect(authErrorMessage(error)).not.toContain('sensitive');
});
