import { sameOrigin } from '../../../src/request';
import { auth } from '../../../src/auth';
import { adminPage } from '../../../src/admin-page';
export const dynamic = 'force-dynamic';
export async function GET() {
  return adminPage('<h1>Verify your email</h1><form method="post"><p><label>Email <input name="email" type="email" autocomplete="username" required></label></p><p><label>Verification code <input name="otp" inputmode="numeric" autocomplete="one-time-code" required maxlength="12"></label></p><button type="submit">Verify email</button><button type="submit" name="resend" value="1" formnovalidate>Send a new code</button></form>');
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return adminPage('<h1>Request rejected</h1>', 403);
  if (Number(request.headers.get('content-length')) > 4096) return adminPage('<h1>Request too large</h1>', 400);
  try {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    if (!process.env.BOARD_ADMIN_EMAIL || email.toLowerCase() !== process.env.BOARD_ADMIN_EMAIL.toLowerCase()) return adminPage('<h1>Access unavailable</h1>', 403);
    const result = form.get('resend') === '1'
      ? await auth().emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
      : await auth().emailOtp.verifyEmail({ email, otp: String(form.get('otp') ?? '') });
    if (result.error) return adminPage('<h1>Verification unsuccessful</h1><a href="/admin/verify">Try again</a>', 400);
    return adminPage(form.get('resend') === '1' ? '<h1>Code requested</h1><a href="/admin/verify">Enter verification code</a>' : '<h1>Email verified</h1><a href="/admin/login">Sign in</a>');
  } catch { return adminPage('<h1>Verification temporarily unavailable</h1>', 503); }
}
