export function isAllowedAdminEmail(email: string) {
  const owner = process.env.BOARD_ADMIN_EMAIL?.trim().toLowerCase();
  const agent = process.env.VERCEL_ENV === 'preview' ? process.env.BOARD_PREVIEW_AGENT_EMAIL?.trim().toLowerCase() : undefined;
  const normalized = email.trim().toLowerCase();
  return Boolean(normalized && ((owner && normalized === owner) || (agent && normalized === agent)));
}
export function isAdmin(user: { email: string; emailVerified?: boolean } | undefined | null) {
  return Boolean(user?.emailVerified && isAllowedAdminEmail(user.email));
}
