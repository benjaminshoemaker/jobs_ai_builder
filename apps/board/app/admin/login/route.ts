import { sameOrigin } from '../../../src/request';
import { auth, isAdmin } from '../../../src/auth';
import { adminPage } from '../../../src/admin-page';
import { isAllowedAdminEmail } from '../../../src/admin-authorization';
export const dynamic = 'force-dynamic';
export async function GET() {
  return adminPage('<h1>Admin sign in</h1><form method="post"><p><label>Email <input name="email" type="email" autocomplete="username" required></label></p><p><label>Password <input name="password" type="password" autocomplete="current-password" required></label></p><button type="submit">Sign in</button></form><p><a href="/admin/setup">Set up your admin account</a></p>');
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return adminPage('<h1>Request rejected</h1>', 403);
  if (Number(request.headers.get('content-length')) > 4096) return adminPage('<h1>Request too large</h1>', 400);
  try {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    if (!isAllowedAdminEmail(email)) return adminPage('<h1>Access unavailable</h1><a href="/admin/login">Try again</a>', 403);
    const result = await auth().signIn.email({ email, password: String(form.get('password') ?? '') });
    if (result.error || !isAdmin(result.data?.user)) return adminPage('<h1>Sign in unsuccessful</h1><p>Check your credentials and verify your email address.</p><a href="/admin/login">Try again</a> · <a href="/admin/verify">Verify email</a>', 401);
    return Response.redirect(new URL('/admin', request.url), 303);
  } catch { return adminPage('<h1>Sign in temporarily unavailable</h1><a href="/admin/login">Try again</a>', 503); }
}
