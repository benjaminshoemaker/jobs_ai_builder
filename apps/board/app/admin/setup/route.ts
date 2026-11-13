import { sameOrigin } from '../../../src/request';
import { auth } from '../../../src/auth';
import { adminPage } from '../../../src/admin-page';
import { authErrorCode, authErrorMessage } from '../../../src/auth-errors';
export const dynamic = 'force-dynamic';
export async function GET() {
  return adminPage('<h1>Set up admin access</h1><p>Only the configured administrator’s verified email can access editorial tools.</p><form method="post"><p><label>Name <input name="name" autocomplete="name" required maxlength="100"></label></p><p><label>Email <input name="email" type="email" autocomplete="username" required></label></p><p><label>Password <input name="password" type="password" autocomplete="new-password" minlength="12" required></label></p><button type="submit">Create account</button></form>');
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return adminPage('<h1>Request rejected</h1>', 403);
  if (Number(request.headers.get('content-length')) > 4096) return adminPage('<h1>Request too large</h1>', 400);
  try {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    if (!process.env.BOARD_ADMIN_EMAIL || email.toLowerCase() !== process.env.BOARD_ADMIN_EMAIL.toLowerCase()) return adminPage('<h1>Access unavailable</h1>', 403);
    const password = String(form.get('password') ?? '');
    if (password.length < 12 || password.length > 128) return adminPage('<h1>Use a password between 12 and 128 characters</h1>', 400);
    const result = await auth().signUp.email({ email, password, name: String(form.get('name') ?? '').slice(0, 100) });
    if (result.error) {
      console.warn('Admin signup rejected', { code: authErrorCode(result.error) });
      return adminPage(`<h1>Account setup unsuccessful</h1><p>${authErrorMessage(result.error)}</p><a href="/admin/setup">Try setup again</a> · <a href="/admin/login">Sign in</a>`, 400);
    }
    return adminPage('<h1>Account created</h1><p>Email verification is required before editorial access is allowed.</p><a href="/admin/verify">Verify your email</a>');
  } catch { return adminPage('<h1>Account setup temporarily unavailable</h1>', 503); }
}
