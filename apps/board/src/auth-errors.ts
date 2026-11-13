const messages: Record<string, string> = {
  INVALID_ORIGIN: 'This preview URL is not registered with the sign-in service. The administrator needs to update its trusted origins.',
  USER_ALREADY_EXISTS: 'An account already exists for this email. Sign in instead.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account already exists for this email. Sign in instead.',
  SIGNUP_DISABLED: 'Account creation is disabled in the sign-in service.',
  PASSWORD_TOO_SHORT: 'Choose a longer password and try again.',
  PASSWORD_TOO_LONG: 'Choose a password of at most 128 characters.',
  INVALID_EMAIL: 'Enter a valid email address.',
  EMAIL_NOT_VERIFIED: 'Verify your email address before signing in.',
  INVALID_EMAIL_OR_PASSWORD: 'The email or password was not recognized.',
};
export function authErrorCode(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,80}$/.test(code) ? code : 'UNKNOWN';
}
export function authErrorMessage(error: unknown) {
  return messages[authErrorCode(error)] ?? 'The sign-in service could not complete this request. Try again, or sign in if you already have an account.';
}
